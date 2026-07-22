import type { SupabaseClient } from "@supabase/supabase-js";

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
