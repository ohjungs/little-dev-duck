import { describe, expect, it } from "vitest";
import { logAction } from "./actionLog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeSupabase(overrides: Record<string, unknown> = {}): any {
  return {
    from: () => ({ insert: async () => ({ error: null }) }),
    ...overrides,
  };
}

describe("logAction", () => {
  it("스네이크케이스 페이로드로 insert한다", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        insert: async (payload: Record<string, unknown>) => {
          captured = payload;
          return { error: null };
        },
      }),
    });
    await logAction(supabase, {
      userId: "u1",
      toolName: "createCalendarEvent",
      argsSummary: '{"title":"회의"}',
      status: "success",
      resultSummary: '{"created":{"id":"e1"}}',
    });
    expect(captured).toEqual({
      user_id: "u1",
      tool_name: "createCalendarEvent",
      args_summary: '{"title":"회의"}',
      status: "success",
      result_summary: '{"created":{"id":"e1"}}',
    });
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({ insert: async () => ({ error: { message: "boom" } }) }),
    });
    await expect(
      logAction(supabase, {
        userId: "u1",
        toolName: "x",
        argsSummary: "{}",
        status: "error",
        resultSummary: "{}",
      }),
    ).rejects.toThrow("boom");
  });
});
