import { describe, expect, it } from "vitest";
import { createPageVersion, listPageVersions } from "./pageVersions";

const VALID_ROW = {
  id: "33333333-3333-4333-8333-333333333333",
  page_id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  title: "문서",
  content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }],
  created_at: "2026-07-22T00:00:00.000Z",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeSupabase(overrides: Record<string, unknown> = {}): any {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
    },
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: VALID_ROW, error: null }) }),
      }),
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [VALID_ROW], error: null }),
          }),
        }),
      }),
    }),
    ...overrides,
  };
}

describe("createPageVersion", () => {
  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      createPageVersion(supabase, {
        pageId: VALID_ROW.page_id,
        title: "t",
        content: [],
      }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("스냅샷을 PageVersion으로 변환해 반환한다", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      auth: {
        getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
      },
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          captured = payload;
          return {
            select: () => ({
              single: async () => ({ data: VALID_ROW, error: null }),
            }),
          };
        },
      }),
    });
    const version = await createPageVersion(supabase, {
      pageId: VALID_ROW.page_id,
      title: "문서",
      content: VALID_ROW.content,
    });
    expect(version.pageId).toBe(VALID_ROW.page_id);
    expect(version.userId).toBe(VALID_ROW.user_id);
    // user_id는 세션에서 주입(클라 입력 불신).
    expect(captured?.user_id).toBe(VALID_ROW.user_id);
  });
});

describe("listPageVersions", () => {
  it("페이지의 버전 목록을 PageVersion[]로 변환한다", async () => {
    const result = await listPageVersions(fakeSupabase(), VALID_ROW.page_id);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("문서");
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: null, error: { message: "boom" } }),
            }),
          }),
        }),
      }),
    });
    await expect(
      listPageVersions(supabase, VALID_ROW.page_id),
    ).rejects.toThrow("boom");
  });
});
