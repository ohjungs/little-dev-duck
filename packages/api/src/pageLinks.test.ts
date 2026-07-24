import { describe, expect, it } from "vitest";
import { listBacklinks, updatePageLinks } from "./pageLinks";

const SOURCE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TARGET_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeSupabase(overrides: Record<string, unknown> = {}): any {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: USER_ID } } }),
    },
    from: () => ({
      select: () => ({
        eq: async () => ({
          data: [
            {
              source_page_id: SOURCE_ID,
              pages: { title: "소스 페이지" },
            },
          ],
          error: null,
        }),
      }),
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
      insert: async () => ({ error: null }),
    }),
    ...overrides,
  };
}

describe("listBacklinks", () => {
  it("target_page_id를 참조하는 페이지 목록을 반환한다", async () => {
    const result = await listBacklinks(fakeSupabase(), TARGET_ID);
    expect(result).toHaveLength(1);
    expect(result[0].sourcePageId).toBe(SOURCE_ID);
    expect(result[0].sourceTitle).toBe("소스 페이지");
  });

  it("pages 조인이 null이면 sourceTitle을 '제목 없음'으로 반환한다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: async () => ({
            data: [{ source_page_id: SOURCE_ID, pages: null }],
            error: null,
          }),
        }),
      }),
    });
    const result = await listBacklinks(supabase, TARGET_ID);
    expect(result[0].sourceTitle).toBe("제목 없음");
  });

  it("data가 null이면 빈 배열을 반환한다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: async () => ({ data: null, error: null }),
        }),
      }),
    });
    const result = await listBacklinks(supabase, TARGET_ID);
    expect(result).toEqual([]);
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: async () => ({ data: null, error: { message: "DB 오류" } }),
        }),
      }),
    });
    await expect(listBacklinks(supabase, TARGET_ID)).rejects.toThrow("DB 오류");
  });
});

describe("updatePageLinks", () => {
  it("비로그인이면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      updatePageLinks(supabase, SOURCE_ID, [TARGET_ID]),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("targetPageIds가 비어있으면 delete만 호출하고 insert는 하지 않는다", async () => {
    let insertCalled = false;
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: null }),
        }),
        insert: async () => {
          insertCalled = true;
          return { error: null };
        },
      }),
    });
    await updatePageLinks(supabase, SOURCE_ID, []);
    expect(insertCalled).toBe(false);
  });

  it("targetPageIds가 있으면 user_id를 세션에서 주입해 insert한다", async () => {
    let capturedRows: unknown;
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: null }),
        }),
        insert: async (rows: unknown) => {
          capturedRows = rows;
          return { error: null };
        },
      }),
    });
    await updatePageLinks(supabase, SOURCE_ID, [TARGET_ID]);
    expect(capturedRows).toEqual([
      {
        user_id: USER_ID,
        source_page_id: SOURCE_ID,
        target_page_id: TARGET_ID,
      },
    ]);
  });

  it("delete 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: { message: "삭제 실패" } }),
        }),
      }),
    });
    await expect(
      updatePageLinks(supabase, SOURCE_ID, [TARGET_ID]),
    ).rejects.toThrow("삭제 실패");
  });

  it("insert 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: null }),
        }),
        insert: async () => ({ error: { message: "삽입 실패" } }),
      }),
    });
    await expect(
      updatePageLinks(supabase, SOURCE_ID, [TARGET_ID]),
    ).rejects.toThrow("삽입 실패");
  });
});
