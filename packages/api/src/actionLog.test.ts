import { describe, expect, it } from "vitest";
import { logAction, recordEvent } from "./actionLog";

const USER_ID = "77777777-7777-4777-8777-777777777777";

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

// 2026-07-26 : 통계 - 로그 (피드백 3-1·3-2)
describe("recordEvent", () => {
  function fake(opts: { user?: { id: string } | null; failInsert?: boolean } = {}) {
    const inserts: Record<string, unknown>[] = [];
    const supabase = {
      auth: {
        getUser: async () => ({
          data: { user: opts.user === undefined ? { id: USER_ID } : opts.user },
        }),
      },
      from: () => ({
        insert: async (payload: Record<string, unknown>) => {
          inserts.push(payload);
          return opts.failInsert ? { error: { message: "boom" } } : { error: null };
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    return { supabase, inserts };
  }

  it("이름·설명을 기록한다", async () => {
    const { supabase, inserts } = fake();
    await recordEvent(supabase, { name: "page:view", detail: "회의록" });
    expect(inserts[0]).toMatchObject({
      tool_name: "page:view",
      args_summary: "회의록",
      status: "success",
    });
  });

  // 이 셋이 이 함수의 존재 이유다 — 로그 때문에 본래 동작이 깨지면 안 된다.
  it("저장이 실패해도 던지지 않는다", async () => {
    const { supabase } = fake({ failInsert: true });
    await expect(recordEvent(supabase, { name: "batch:x" })).resolves.toBeUndefined();
  });

  it("로그인하지 않았으면 조용히 아무것도 하지 않는다", async () => {
    const { supabase, inserts } = fake({ user: null });
    await expect(recordEvent(supabase, { name: "page:view" })).resolves.toBeUndefined();
    expect(inserts).toHaveLength(0);
  });

  it("설명이 없어도 not null 컬럼을 빈 문자열로 채운다", async () => {
    // null을 넣으면 PostgREST가 요청 전체를 거부해 기록이 통째로 실패한다.
    const { supabase, inserts } = fake();
    await recordEvent(supabase, { name: "app:x" });
    expect(inserts[0].args_summary).toBe("");
    expect(inserts[0].result_summary).toBe("");
  });

  it("아주 긴 설명은 잘라서 넣는다(컬럼 상한 초과 방지)", async () => {
    const { supabase, inserts } = fake();
    await recordEvent(supabase, { name: "app:x", detail: "가".repeat(900) });
    expect(String(inserts[0].args_summary).length).toBe(500);
  });
});
