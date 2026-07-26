import type { SupabaseClient } from "@supabase/supabase-js";
import { pomodoroSessionSchema, type PomodoroSession } from "@ldd/core";
import { applyXpAward } from "./duckState";

type PomodoroRow = {
  id: string;
  user_id: string;
  duration_minutes: number;
  tag: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

function fromRow(row: PomodoroRow): PomodoroSession {
  return pomodoroSessionSchema.parse({
    id: row.id,
    userId: row.user_id,
    durationMinutes: row.duration_minutes,
    tag: row.tag,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  });
}

export async function listPomodoroSessions(
  supabase: SupabaseClient,
): Promise<PomodoroSession[]> {
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data as PomodoroRow[]).map(fromRow);
}

export type StartPomodoroInput = {
  durationMinutes: number;
  tag?: string | null;
};

export async function startPomodoro(
  supabase: SupabaseClient,
  input: StartPomodoroInput,
): Promise<PomodoroSession> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .insert({
      user_id: user.id,
      duration_minutes: input.durationMinutes,
      tag: input.tag ?? null,
      started_at: new Date().toISOString(),
      completed_at: null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as PomodoroRow);
}

// 진행 중 세션을 완료 처리한다. completed_at이 아직 null일 때만 갱신하므로(WHERE 조건이 서버에서
// 원자적으로 평가), 재시도·중복 호출로 XP가 이중 지급되는 것을 DB 차원에서 막는다. 실제로 완료된
// 경우에만 XP를 지급한다.
export async function completePomodoro(
  supabase: SupabaseClient,
  id: string,
): Promise<PomodoroSession> {
  const { data, error } = await supabase
    .from("pomodoro_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id)
    .is("completed_at", null)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    // 이미 완료된 세션 - XP 재지급 없이 현재 상태를 조회해 반환한다.
    const { data: existing, error: fetchError } = await supabase
      .from("pomodoro_sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    return fromRow(existing as PomodoroRow);
  }

  const session = fromRow(data as PomodoroRow);
  await applyXpAward(supabase, session.userId, "pomodoroComplete");
  return session;
}

// 2026-07-26 : 백업 - 집중 기록 복원 (Phase 31 T2)
// restoreTodo와 같은 계약: 같은 id로 넣고, 인자의 userId는 무시하고 로그인 사용자로 채우며,
// 이미 있으면 멱등 성공. **XP를 주지 않는다** — 과거 기록을 되돌리는 것이지 지금 집중한 게 아니다
// (completePomodoro를 거치지 않고 직접 insert하는 이유).
export async function restorePomodoroSession(
  supabase: SupabaseClient,
  session: PomodoroSession,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("pomodoro_sessions").insert({
    id: session.id,
    user_id: user.id,
    duration_minutes: session.durationMinutes,
    tag: session.tag,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    created_at: session.createdAt,
  });
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(error.message);
  }
}
