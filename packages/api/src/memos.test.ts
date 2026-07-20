import { describe, expect, it } from "vitest";
import { createMemo, deleteMemo, listMemos, updateMemo } from "./memos";

const VALID_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  title: "회의 메모",
  content: "다음 스프린트 계획",
  created_at: "2026-07-20T00:00:00.000Z",
  updated_at: "2026-07-20T00:00:00.000Z",
};

function fakeSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: VALID_ROW.user_id } },
      }),
    },
    from: () => ({
      select: () => ({
        order: async () => ({ data: [VALID_ROW], error: null }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: VALID_ROW, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: VALID_ROW, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("listMemos", () => {
  it("정상 응답을 Memo[]로 변환한다", async () => {
    const result = await listMemos(fakeSupabase());
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("회의 메모");
  });

  it("잘못된 형태의 응답이면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          order: async () => ({
            data: [{ ...VALID_ROW, title: "" }],
            error: null,
          }),
        }),
      }),
    });
    await expect(listMemos(supabase)).rejects.toThrow();
  });
});

describe("createMemo", () => {
  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      createMemo(supabase, { title: "test", content: "" }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("정상 입력이면 Memo를 반환한다", async () => {
    const result = await createMemo(fakeSupabase(), {
      title: "회의 메모",
      content: "다음 스프린트 계획",
    });
    expect(result.title).toBe("회의 메모");
  });
});

describe("updateMemo", () => {
  it("정상 patch면 갱신된 Memo를 반환한다", async () => {
    const result = await updateMemo(fakeSupabase(), VALID_ROW.id, {
      content: "수정된 내용",
    });
    expect(result.id).toBe(VALID_ROW.id);
  });
});

describe("deleteMemo", () => {
  it("에러 없이 완료된다", async () => {
    await expect(
      deleteMemo(fakeSupabase(), VALID_ROW.id),
    ).resolves.toBeUndefined();
  });
});
