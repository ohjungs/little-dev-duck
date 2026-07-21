import { describe, expect, it, vi } from "vitest";
import { upsertActivityDaily } from "./activity";

const USER_ID = "22222222-2222-4222-8222-222222222222";

// upsert 호출 인자를 캡처하는 fake. 반환값뿐 아니라 write path(행 구성/onConflict/테이블명)를
// 검증하기 위해 from/upsert를 spy로 만든다.
function fakeSupabase(
  overrides: Record<string, unknown> = {},
  selectResult: { data: unknown; error: unknown } = {
    data: [{ date: "2026-07-21", source: "claude_code", count: 3 }],
    error: null,
  },
) {
  const upsert = vi.fn(() => ({
    select: async () => selectResult,
  }));
  const from = vi.fn(() => ({ upsert }));
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } } }),
    },
    from,
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { supabase, from, upsert };
}

describe("upsertActivityDaily", () => {
  it("빈 배열이면 supabase를 호출하지 않고 빈 배열을 반환한다", async () => {
    const { supabase, from } = fakeSupabase();
    const result = await upsertActivityDaily(supabase, "claude_code", []);
    expect(result).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });

  it("로그인하지 않으면 에러를 던진다", async () => {
    const { supabase } = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      upsertActivityDaily(supabase, "claude_code", [{ date: "2026-07-21", count: 1 }]),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("정상 입력이면 저장된 항목을 반환한다", async () => {
    const { supabase } = fakeSupabase();
    const result = await upsertActivityDaily(supabase, "claude_code", [
      { date: "2026-07-21", count: 3 },
    ]);
    expect(result).toEqual([{ date: "2026-07-21", source: "claude_code", count: 3 }]);
  });

  it("activity_daily 테이블에 user_id를 스탬핑하고 onConflict로 upsert한다", async () => {
    const { supabase, from, upsert } = fakeSupabase();
    await upsertActivityDaily(supabase, "claude_code", [
      { date: "2026-07-21", count: 3 },
      { date: "2026-07-20", count: 1 },
    ]);

    // 테이블명 검증.
    expect(from).toHaveBeenCalledWith("activity_daily");

    // 행 구성: 각 entry가 로그인 사용자 id로 스탬핑되고 source가 붙는지 (RLS 계약의 유일한 지점).
    const call = upsert.mock.calls[0] as unknown as [
      Array<Record<string, unknown>>,
      { onConflict: string },
    ];
    const rows = call[0];
    const options = call[1];
    expect(rows).toEqual([
      expect.objectContaining({
        user_id: USER_ID,
        date: "2026-07-21",
        source: "claude_code",
        count: 3,
      }),
      expect.objectContaining({
        user_id: USER_ID,
        date: "2026-07-20",
        source: "claude_code",
        count: 1,
      }),
    ]);
    // updated_at이 갱신 경로에서 세팅되는지 (미세팅 시 최초 시각 고정 버그).
    expect(rows[0]).toHaveProperty("updated_at");
    // onConflict 타깃이 unique 제약과 일치하는지 - 틀리면 갱신 대신 중복 삽입/제약 위반.
    expect(options).toEqual({ onConflict: "user_id,date,source" });
  });

  it("DB 에러면 예외를 던진다", async () => {
    const { supabase } = fakeSupabase(
      {},
      { data: null, error: { message: "connection failed" } },
    );
    await expect(
      upsertActivityDaily(supabase, "claude_code", [{ date: "2026-07-21", count: 1 }]),
    ).rejects.toThrow("connection failed");
  });
});
