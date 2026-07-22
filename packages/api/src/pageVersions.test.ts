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

// 실제 저장된 페이지(스냅샷 원본). createPageVersion은 클라 입력이 아니라 이 값에서 스냅샷을 뜬다.
const PAGE_ROW = { title: "서버 제목", content: [{ type: "paragraph", content: [] }] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeSupabase(overrides: Record<string, unknown> = {}): any {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
    },
    from: () => ({
      // createPageVersion의 pages SELECT(.eq.single) + listPageVersions(.eq.order.limit) 둘 다 지원.
      select: () => ({
        eq: () => ({
          single: async () => ({ data: PAGE_ROW, error: null }),
          order: () => ({
            limit: async () => ({ data: [VALID_ROW], error: null }),
          }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: VALID_ROW, error: null }),
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
      createPageVersion(supabase, { pageId: VALID_ROW.page_id }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("본인 소유가 아니거나 없는 페이지면(SELECT 행 없음) 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { message: "no rows" } }),
          }),
        }),
      }),
    });
    await expect(
      createPageVersion(supabase, { pageId: VALID_ROW.page_id }),
    ).rejects.toThrow("no rows");
  });

  it("스냅샷 title/content를 클라 입력이 아니라 서버 페이지에서 파생하고 user_id를 세션에서 주입한다", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      auth: {
        getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: PAGE_ROW, error: null }),
          }),
        }),
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
    await createPageVersion(supabase, { pageId: VALID_ROW.page_id });
    expect(captured?.title).toBe(PAGE_ROW.title);
    expect(captured?.content).toBe(PAGE_ROW.content);
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
