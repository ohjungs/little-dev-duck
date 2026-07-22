import { describe, expect, it } from "vitest";
import {
  createPage,
  getPage,
  listPages,
  purgePage,
  restorePage,
  searchPages,
  softDeletePage,
  updatePage,
} from "./pages";

const VALID_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  parent_id: null,
  title: "문서",
  content: [],
  plain_text: "",
  icon: null,
  is_trashed: false,
  trashed_at: null,
  created_at: "2026-07-20T00:00:00.000Z",
  updated_at: "2026-07-20T00:00:00.000Z",
};

const okSingle = async () => ({ data: VALID_ROW, error: null });

function fakeSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: [VALID_ROW], error: null }),
          maybeSingle: okSingle,
        }),
      }),
      insert: () => ({
        select: () => ({ single: okSingle }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({ single: okSingle }),
          // softDelete/restore는 update().eq()를 그대로 await → { error: null }
          then: (resolve: (v: { error: null }) => void) =>
            resolve({ error: null }),
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

describe("listPages", () => {
  it("휴지통 제외 목록을 Page[]로 변환한다", async () => {
    const result = await listPages(fakeSupabase());
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("문서");
    expect(result[0].isTrashed).toBe(false);
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: null,
              error: { message: "boom" },
            }),
          }),
        }),
      }),
    });
    await expect(listPages(supabase)).rejects.toThrow("boom");
  });
});

describe("searchPages", () => {
  // .or().order().limit() 체인을 흉내내고, or() 필터 문자열을 캡처한다.
  function searchSupabase(rows: unknown[], sink?: { filter?: string }) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            or: (filter: string) => {
              if (sink) sink.filter = filter;
              return {
                order: () => ({
                  limit: async () => ({ data: rows, error: null }),
                }),
              };
            },
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it("빈/공백 쿼리는 DB 조회 없이 빈 배열을 반환한다", async () => {
    expect(await searchPages(searchSupabase([VALID_ROW]), "   ")).toEqual([]);
  });

  it("제목/본문 ilike 결과를 Page[]로 변환한다", async () => {
    const result = await searchPages(searchSupabase([VALID_ROW]), "문서");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("문서");
  });

  it("PostgREST or() 예약문자와 ilike 와일드카드를 제거해 필터 인젝션을 막는다", async () => {
    const sink: { filter?: string } = {};
    await searchPages(searchSupabase([], sink), 'a,b(c)"d\\e%f_g');
    // 예약문자는 공백→단일 공백으로 정규화되어 title/plain_text 두 절에만 삽입된다.
    expect(sink.filter).toBe("title.ilike.%a b c d e f g%,plain_text.ilike.%a b c d e f g%");
  });
});

describe("getPage", () => {
  it("없으면 null을 반환한다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      }),
    });
    expect(await getPage(supabase, VALID_ROW.id)).toBeNull();
  });
});

describe("createPage", () => {
  it("로그인하지 않으면 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(createPage(supabase, {})).rejects.toThrow(
      "로그인이 필요합니다.",
    );
  });

  it("plain_text를 content에서 서버가 파생해 저장한다", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      auth: {
        getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
      },
      from: () => ({
        insert: (payload: Record<string, unknown>) => {
          captured = payload;
          return { select: () => ({ single: okSingle }) };
        },
      }),
    });
    await createPage(supabase, {
      title: "노트",
      content: [{ type: "paragraph", content: [{ type: "text", text: "안녕" }] }],
    });
    expect(captured?.plain_text).toBe("안녕");
    expect(captured?.title).toBe("노트");
  });
});

describe("updatePage", () => {
  it("정상 patch면 갱신된 Page를 반환한다", async () => {
    const result = await updatePage(fakeSupabase(), VALID_ROW.id, {
      title: "수정",
    });
    expect(result.id).toBe(VALID_ROW.id);
  });

  it("content 변경 시 plain_text도 함께 파생해 갱신한다", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        update: (payload: Record<string, unknown>) => {
          captured = payload;
          return { eq: () => ({ select: () => ({ single: okSingle }) }) };
        },
      }),
    });
    await updatePage(supabase, VALID_ROW.id, {
      content: [{ type: "paragraph", content: [{ type: "text", text: "본문" }] }],
    });
    expect(captured?.plain_text).toBe("본문");
  });
});

describe("soft delete lifecycle", () => {
  it("softDeletePage/restorePage/purgePage가 에러 없이 완료된다", async () => {
    await expect(
      softDeletePage(fakeSupabase(), VALID_ROW.id),
    ).resolves.toBeUndefined();
    await expect(
      restorePage(fakeSupabase(), VALID_ROW.id),
    ).resolves.toBeUndefined();
    await expect(
      purgePage(fakeSupabase(), VALID_ROW.id),
    ).resolves.toBeUndefined();
  });
});
