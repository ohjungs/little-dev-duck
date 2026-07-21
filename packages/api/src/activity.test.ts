import { describe, expect, it } from "vitest";
import { upsertActivityDaily } from "./activity";

const USER_ID = "22222222-2222-4222-8222-222222222222";

function fakeSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: USER_ID } },
      }),
    },
    from: () => ({
      upsert: () => ({
        select: async () => ({
          data: [{ date: "2026-07-21", source: "claude_code", count: 3 }],
          error: null,
        }),
      }),
    }),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("upsertActivityDaily", () => {
  it("빈 배열이면 supabase를 호출하지 않고 빈 배열을 반환한다", async () => {
    const result = await upsertActivityDaily(fakeSupabase(), "claude_code", []);
    expect(result).toEqual([]);
  });

  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      upsertActivityDaily(supabase, "claude_code", [{ date: "2026-07-21", count: 1 }]),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("정상 입력이면 저장된 항목을 반환한다", async () => {
    const result = await upsertActivityDaily(fakeSupabase(), "claude_code", [
      { date: "2026-07-21", count: 3 },
    ]);
    expect(result).toEqual([{ date: "2026-07-21", source: "claude_code", count: 3 }]);
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        upsert: () => ({
          select: async () => ({
            data: null,
            error: { message: "connection failed" },
          }),
        }),
      }),
    });
    await expect(
      upsertActivityDaily(supabase, "claude_code", [{ date: "2026-07-21", count: 1 }]),
    ).rejects.toThrow("connection failed");
  });
});
