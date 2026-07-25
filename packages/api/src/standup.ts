import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatStandupPrompt,
  kstDateString,
  formatWeeklyDigestLines,
  hasActivity,
  weeklyDigestTitle,
  type DigestRange,
  type StandupInput,
} from "@ldd/core";
import { geminiGenerate } from "./gemini";

// 기간 활동 데이터를 직접 조회한다. 기존 list 함수는 날짜 필터를 지원하지 않아 직접 쿼리.
// until을 주면 [since, until) 구간, 없으면 since 이후 전부(스탠드업의 기존 24시간 동작).
// 2026-07-26 : 활동집계 - 기간일반화
// 주간 다이제스트(Phase 18 T4)가 같은 집계를 주 단위로 쓰기 위해 since/until을 인자로 뺐다.
// 스탠드업 호출부는 until 없이 그대로라 동작 불변.
export async function gatherActivity(
  supabase: SupabaseClient,
  since: string,
  until?: string,
): Promise<StandupInput> {
  // 제네릭 헬퍼로 묶으면 Supabase 빌더 타입 재귀가 터진다(TS2589) — 평범하게 하나씩 쓴다.
  const todosQ = supabase.from("todos").select("is_done").gte("updated_at", since);
  const habitsQ = supabase.from("habit_checks").select("id").gte("created_at", since);
  const pomosQ = supabase
    .from("pomodoro_sessions")
    .select("duration_minutes")
    .gte("started_at", since)
    .not("completed_at", "is", null);
  const calQ = supabase.from("calendar_events").select("title").gte("start_at", since);
  const pagesQ = supabase
    .from("pages")
    .select("id")
    .gte("updated_at", since)
    .eq("is_trashed", false);

  const [todosRes, habitsRes, pomosRes, calRes, pagesRes] = await Promise.all([
    until ? todosQ.lte("updated_at", until) : todosQ,
    until ? habitsQ.lte("created_at", until) : habitsQ,
    until ? pomosQ.lte("started_at", until) : pomosQ,
    until ? calQ.lte("start_at", until) : calQ,
    until ? pagesQ.lte("updated_at", until) : pagesQ,
  ]);

  const todos = (todosRes.data ?? []) as { is_done: boolean }[];
  const habitChecks = (habitsRes.data ?? []) as { id: string }[];
  const pomos = (pomosRes.data ?? []) as { duration_minutes: number }[];
  const calEvents = (calRes.data ?? []) as { title: string }[];
  const pages = (pagesRes.data ?? []) as { id: string }[];

  // 전체 할 일 수는 24시간 기준이 아닌 전체 미완료+완료 합산이 무의미하므로,
  // 24시간 안에 갱신된 항목(완료 여부 무관)을 todosTotal로, 완료된 것만 todosCompleted로 집계한다.
  const todosCompleted = todos.filter((t) => t.is_done).length;
  const todosTotal = todos.length;

  // 습관 전체 개수는 habit_checks 기준 집계가 불가하므로 체크 수만 반영한다.
  const habitsChecked = habitChecks.length;
  const habitsTotal = habitsChecked; // 체크된 것만 있으므로 동일 — 프롬프트에서 n/n 완료로 표시.

  const pomodoroSessions = pomos.length;
  const pomodoroMinutes = pomos.reduce((s, p) => s + p.duration_minutes, 0);
  const calendarEvents = calEvents.map((e) => e.title);
  const pagesEdited = pages.length;

  return {
    todosCompleted,
    todosTotal,
    habitsChecked,
    habitsTotal,
    pomodoroSessions,
    pomodoroMinutes,
    calendarEvents,
    pagesEdited,
  };
}

// 24시간 활동 수집 → Gemini 스탠드업 생성. 활동 없으면 null 반환(페이지 생성 스킵 신호).
export async function generateStandup(
  supabase: SupabaseClient,
  geminiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ content: string } | null> {
  const input = await gatherActivity(
    supabase,
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  );
  if (!hasActivity(input)) return null;

  // 서버(Vercel)는 UTC로 돈다. toISOString()을 그대로 자르면 KST 00:00~09:00 사이에
  // 스탠드업이 **어제 날짜**로 적힌다(Phase 19에서 습관 체크가 밟았던 함정과 같다).
  const today = kstDateString(new Date());
  const prompt = formatStandupPrompt(input, today);
  const content = await geminiGenerate(prompt, geminiKey, fetchImpl);
  return { content };
}

// 지난 주 활동을 모아 다이제스트 본문 줄을 만든다. 활동이 전혀 없으면 null(생성 스킵 신호) —
// 아무것도 안 한 주에 "0개 완료" 페이지를 만들어 쌓으면 복귀 훅이 아니라 잔소리가 된다.
// LLM을 쓰지 않으므로 Gemini 키·쿼터와 무관하게 항상 동작한다(스탠드업과 다른 점).
export async function generateWeeklyDigest(
  supabase: SupabaseClient,
  range: DigestRange,
): Promise<{ title: string; lines: string[] } | null> {
  // 로컬 날짜 경계를 그대로 ISO로 넘기면 UTC로 해석돼 하루가 밀린다. 로컬 자정 기준으로 만든다.
  const [sy, sm, sd] = range.start.split("-").map(Number);
  const [ey, em, ed] = range.end.split("-").map(Number);
  const since = new Date(sy, sm - 1, sd).toISOString();
  const until = new Date(ey, em - 1, ed, 23, 59, 59, 999).toISOString();

  const title = weeklyDigestTitle(range);

  // 2026-07-26 : 리텐션 - 주간다이제스트 - 기기간중복
  // 중복 판정 키는 localStorage(기기별)라, 데스크톱 위젯과 브라우저를 같이 쓰면 같은 주 다이제스트가
  // 두 번 만들어진다. 제목에 기간이 박혀 있으므로 같은 제목이 이미 있으면 서버 기준으로 건너뛴다.
  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("title", title)
    .eq("is_trashed", false)
    .limit(1);
  if (existing && existing.length > 0) return null;

  const input = await gatherActivity(supabase, since, until);
  if (!hasActivity(input)) return null;
  return { title, lines: formatWeeklyDigestLines(input, range) };
}
