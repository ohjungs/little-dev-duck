import type { SupabaseClient } from "@supabase/supabase-js";
import { formatStandupPrompt, hasActivity, type StandupInput } from "@ldd/core";
import { geminiGenerate } from "./gemini";

// 24시간 활동 데이터를 직접 조회한다. 기존 list 함수는 날짜 필터를 지원하지 않아 직접 쿼리.
async function gatherStandupInput(supabase: SupabaseClient): Promise<StandupInput> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [todosRes, habitsRes, pomosRes, calRes, pagesRes] = await Promise.all([
    supabase.from("todos").select("is_done").gte("updated_at", since),
    supabase.from("habit_checks").select("id").gte("created_at", since),
    supabase
      .from("pomodoro_sessions")
      .select("duration_minutes")
      .gte("started_at", since)
      .not("completed_at", "is", null),
    supabase
      .from("calendar_events")
      .select("title")
      .gte("start_at", since),
    supabase.from("pages").select("id").gte("updated_at", since).eq("is_trashed", false),
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
  const input = await gatherStandupInput(supabase);
  if (!hasActivity(input)) return null;

  const today = new Date().toISOString().slice(0, 10);
  const prompt = formatStandupPrompt(input, today);
  const content = await geminiGenerate(prompt, geminiKey, fetchImpl);
  return { content };
}
