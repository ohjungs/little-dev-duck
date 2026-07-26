import type { SupabaseClient } from "@supabase/supabase-js";
import { actionLogEntrySchema, type ActionLogEntry } from "@ldd/core";

export type LogActionInput = {
  userId: string;
  toolName: string;
  argsSummary: string;
  status: "success" | "error";
  resultSummary: string;
};

// 실행된 mutating 도구 호출을 감사 로그에 남긴다(T7). 로깅 실패로 실제 액션 결과가 사용자에게 전달되지
// 못하면 안 되므로 호출부가 에러를 삼키는 것을 전제로 한다(best-effort — 부가 기능).
export async function logAction(
  supabase: SupabaseClient,
  input: LogActionInput,
): Promise<void> {
  const { error } = await supabase.from("action_log").insert({
    user_id: input.userId,
    tool_name: input.toolName,
    args_summary: input.argsSummary,
    status: input.status,
    result_summary: input.resultSummary,
  });
  if (error) throw new Error(error.message);
}

// 2026-07-26 : 통계 - 로그조회 (피드백 3-1·3-2)
// 화면에서 볼 수 있어야 로그가 의미가 있다. 지금까지는 쓰기만 있고 읽는 경로가 없었다.
// RLS가 본인 행만 돌려주므로 여기서 user_id를 다시 걸지 않는다(조건이 두 곳에 있으면 갈라진다).
//
// 상한을 둔다: 이 목록은 계속 쌓이기만 하는 테이블이고(불변 감사 로그, 삭제 정책 없음)
// 전부 가져오면 무료 티어에서 전송량이 그대로 깎인다. 화면은 최근 것만 본다.
export const ACTION_LOG_PAGE_MAX = 300;

export async function listActionLog(
  supabase: SupabaseClient,
  limit = 100,
): Promise<ActionLogEntry[]> {
  const capped = Math.max(1, Math.min(limit, ACTION_LOG_PAGE_MAX));
  const { data, error } = await supabase
    .from("action_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(capped);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return actionLogEntrySchema.parse({
      id: row.id,
      userId: row.user_id,
      toolName: row.tool_name,
      argsSummary: row.args_summary,
      status: row.status,
      resultSummary: row.result_summary,
      createdAt: row.created_at,
    });
  });
}

// 기록용 얇은 헬퍼. **실패해도 절대 던지지 않는다** — 로그를 남기려다 본래 동작이 깨지면
// 안 된다(logAction은 던지므로 호출부마다 try/catch를 쓰던 것을 여기로 모은다).
// 로그인 사용자를 여기서 찾으므로 호출부가 userId를 챙기지 않아도 된다.
export async function recordEvent(
  supabase: SupabaseClient,
  input: { name: string; detail?: string; status?: "success" | "error"; result?: string },
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await logAction(supabase, {
      userId: user.id,
      toolName: input.name,
      // DB가 not null이라 빈 문자열로라도 채운다(null이면 insert가 통째로 거부된다).
      argsSummary: (input.detail ?? "").slice(0, 500),
      status: input.status ?? "success",
      resultSummary: (input.result ?? "").slice(0, 500),
    });
  } catch {
    // 기록 실패는 삼킨다. 감사 로그는 부가 기능이고, 여기서 던지면 방문·수집 같은
    // 본래 동작이 로그 때문에 실패한다. (호출부는 이 함수가 절대 던지지 않는다고 가정한다.)
  }
}
