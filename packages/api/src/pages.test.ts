import { describe, expect, it } from "vitest";
import { createDefaultDbSchema } from "@ldd/core";
import {
  createPage,
  getPage,
  getPublicPage,
  listChildPages,
  listPages,
  listPagesForExport,
  restorePageFromBackup,
  listTrashedPages,
  publishPage,
  purgePage,
  restorePage,
  searchPages,
  softDeletePage,
  unpublishPage,
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
          order: () => ({ limit: async () => ({ data: [VALID_ROW], error: null }) }),
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
            order: () => ({
              limit: async () => ({
                data: null,
                error: { message: "boom" },
              }),
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

  // Phase 18 T2: 시작 템플릿이 데이터베이스 페이지를 한 번에 만든다(2단계 생성 시 중간 실패로
  // 열 없는 빈 페이지가 남는 걸 방지).
  it("dbSchema를 주면 db_schema로 함께 저장한다", async () => {
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
    const dbSchema = createDefaultDbSchema();
    await createPage(supabase, { title: "트래커", dbSchema });
    expect(captured?.db_schema).toEqual(dbSchema);
  });

  it("dbSchema를 안 주면 db_schema 키 자체를 넣지 않는다(기존 동작 보존)", async () => {
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
    await createPage(supabase, { title: "일반 페이지" });
    expect(captured).not.toHaveProperty("db_schema");
  });

  it("잘못된 모양의 dbSchema는 저장 전에 막는다(신뢰 경계)", async () => {
    const supabase = fakeSupabase({
      auth: {
        getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }),
      },
    });
    await expect(
      createPage(supabase, {
        title: "깨진 스키마",
        // views가 최소 1개여야 한다
        dbSchema: { properties: [], views: [] } as never,
      }),
    ).rejects.toThrow();
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

describe("Phase 11 DB 뷰", () => {
  // listChildPages는 select().eq(parent).eq(trashed).order() 2단 eq 체인이라 전용 목이 필요.
  function childSupabase(rows: unknown[]) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: async () => ({ data: rows, error: null }),
            }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it("listChildPages는 자식 행 목록을 Page[]로 변환한다", async () => {
    const dbRow = {
      ...VALID_ROW,
      id: "33333333-3333-4333-8333-333333333333",
      parent_id: VALID_ROW.id,
      row_props: { status: "todo" },
    };
    const result = await listChildPages(childSupabase([dbRow]), VALID_ROW.id);
    expect(result).toHaveLength(1);
    expect(result[0].rowProps).toEqual({ status: "todo" });
  });

  it("db_schema/row_props 없는 행은 기본값(null/{})으로 파싱된다(하위호환)", async () => {
    const result = await listPages(fakeSupabase());
    expect(result[0].dbSchema).toBeNull();
    expect(result[0].rowProps).toEqual({});
  });

  it("updatePage는 잘못된 dbSchema(뷰 0개)를 쓰기 전에 거부한다", async () => {
    // views min(1) 위반 — 저장되면 읽기 경로가 강등하므로 애초에 막는다(보안 리뷰 HIGH).
    await expect(
      updatePage(fakeSupabase(), VALID_ROW.id, {
        dbSchema: { properties: [], views: [] },
      }),
    ).rejects.toThrow();
  });

  it("updatePage는 상한 초과 rowProps 값을 쓰기 전에 거부한다", async () => {
    await expect(
      updatePage(fakeSupabase(), VALID_ROW.id, {
        rowProps: { big: "a".repeat(2001) },
      }),
    ).rejects.toThrow();
  });

  it("listChildPages는 잘못된 db_schema 행도 목록을 죽이지 않고 dbSchema=null로 강등한다", async () => {
    const badRow = {
      ...VALID_ROW,
      id: "44444444-4444-4444-8444-444444444444",
      parent_id: VALID_ROW.id,
      db_schema: { garbage: true },
      row_props: { nope: { nested: 1 } },
    };
    const result = await listChildPages(childSupabase([badRow]), VALID_ROW.id);
    expect(result).toHaveLength(1);
    expect(result[0].dbSchema).toBeNull();
    expect(result[0].rowProps).toEqual({});
  });

  it("updatePage가 dbSchema를 db_schema로, rowProps를 row_props로 저장한다", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        update: (payload: Record<string, unknown>) => {
          captured = payload;
          return { eq: () => ({ select: () => ({ single: okSingle }) }) };
        },
      }),
    });
    const dbSchema = {
      properties: [{ id: "status", name: "상태", type: "select" as const, options: [] }],
      views: [
        {
          id: "table",
          name: "표",
          type: "table" as const,
          groupByPropId: null,
          sort: null,
          filters: [],
          hiddenPropIds: [],
          aggregations: {},
        },
      ],
    };
    await updatePage(supabase, VALID_ROW.id, {
      dbSchema,
      rowProps: { status: "done" },
    });
    expect(captured?.db_schema).toEqual(dbSchema);
    expect(captured?.row_props).toEqual({ status: "done" });
  });
});

describe("Phase 12 공개 공유", () => {
  it("publishPage는 비공개 페이지에 slug를 생성하고 is_public=true로 저장한다", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        // getPage → 비공개 VALID_ROW
        select: () => ({ eq: () => ({ maybeSingle: okSingle }) }),
        update: (payload: Record<string, unknown>) => {
          captured = payload;
          return { eq: async () => ({ error: null }) };
        },
      }),
    });
    const { slug } = await publishPage(supabase, VALID_ROW.id);
    expect(captured?.is_public).toBe(true);
    expect(typeof captured?.public_slug).toBe("string");
    expect(slug).toBe(captured?.public_slug);
  });

  it("publishPage는 이미 공개면 기존 slug를 재사용하고 update하지 않는다", async () => {
    const PUBLIC_ROW = { ...VALID_ROW, is_public: true, public_slug: "existing" };
    let updateCalled = false;
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: PUBLIC_ROW, error: null }),
          }),
        }),
        update: () => {
          updateCalled = true;
          return { eq: async () => ({ error: null }) };
        },
      }),
    });
    const { slug } = await publishPage(supabase, VALID_ROW.id);
    expect(slug).toBe("existing");
    expect(updateCalled).toBe(false);
  });

  it("unpublishPage는 is_public=false로 내리고 slug를 지운다", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        update: (payload: Record<string, unknown>) => {
          captured = payload;
          return { eq: async () => ({ error: null }) };
        },
      }),
    });
    await unpublishPage(supabase, VALID_ROW.id);
    expect(captured?.is_public).toBe(false);
    expect(captured?.public_slug).toBeNull();
  });

  it("getPublicPage는 rpc 결과를 PublicPage로 매핑한다", async () => {
    const supabase = {
      rpc: async () => ({
        data: [
          {
            id: "x",
            title: "공개 문서",
            content: [],
            icon: null,
            updated_at: "2026-07-24T00:00:00.000Z",
          },
        ],
        error: null,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const page = await getPublicPage(supabase, "slug123");
    expect(page?.title).toBe("공개 문서");
    expect(page?.updatedAt).toBe("2026-07-24T00:00:00.000Z");
  });

  it("getPublicPage는 결과가 없으면 null을 반환한다", async () => {
    const supabase = {
      rpc: async () => ({ data: [], error: null }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    expect(await getPublicPage(supabase, "nope")).toBeNull();
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

// 2026-07-26: "내 데이터 내보내기"가 페이지 **본문을 통째로 빠뜨리고** 있었다.
// listPages가 content를 일부러 빼는데(사이드바용) 백업이 그걸 그대로 썼기 때문이다.
// 본문 없는 백업은 제목 목록일 뿐이라, 여기서 "본문을 실제로 요청하는가"를 잠근다.
describe("listPagesForExport", () => {
  function captureSelect() {
    const seen: string[] = [];
    return {
      seen,
      supabase: fakeSupabase({
        from: () => ({
          select: (cols: string) => {
            seen.push(cols);
            return {
              eq: () => ({
                order: () => ({
                  limit: async () => ({ data: [VALID_ROW], error: null }),
                }),
              }),
            };
          },
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    };
  }

  it("본문(content)을 포함해 조회한다", async () => {
    const { seen, supabase } = captureSelect();
    await listPagesForExport(supabase);
    // 목록용처럼 컬럼을 나열하면 content가 빠진다 — 전체를 받아야 한다.
    expect(seen[0]).toBe("*");
  });

  it("본문을 Page.content로 실어 돌려준다", async () => {
    const result = await listPagesForExport(fakeSupabase());
    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual([]);
  });

  it("휴지통 페이지는 백업에 넣지 않는다", async () => {
    // 사용자가 지운 문서가 백업으로 되살아나면 삭제가 삭제가 아니게 된다.
    const calls: unknown[][] = [];
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: (col: string, val: unknown) => {
            calls.push([col, val]);
            return {
              order: () => ({
                limit: async () => ({ data: [VALID_ROW], error: null }),
              }),
            };
          },
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    await listPagesForExport(supabase);
    expect(calls).toEqual([["is_trashed", false]]);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    await expect(listPagesForExport(supabase)).rejects.toThrow("boom");
  });
});

describe("restorePageFromBackup", () => {
  function captureInsert() {
    const captured: { payload?: Record<string, unknown> } = {};
    const supabase = fakeSupabase({
      auth: {
        getUser: async () => ({ data: { user: { id: "99999999-9999-4999-8999-999999999999" } } }),
      },
      from: () => ({
        insert: async (payload: Record<string, unknown>) => {
          captured.payload = payload;
          return { error: null };
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    return { captured, supabase };
  }

  const backupPage = (over: Record<string, unknown> = {}) =>
    ({
      id: VALID_ROW.id,
      userId: VALID_ROW.user_id,
      parentId: null,
      title: "문서",
      content: [{ type: "paragraph", content: [{ type: "text", text: "안녕" }] }],
      plainText: "거짓말",
      icon: null,
      isTrashed: false,
      trashedAt: null,
      createdAt: VALID_ROW.created_at,
      updatedAt: VALID_ROW.updated_at,
      dbSchema: null,
      rowProps: {},
      isPublic: true,
      publicSlug: "taken-slug",
      coverUrl: null,
      ...over,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  it("같은 id로 넣는다 (계층·임베딩 참조가 끊기지 않아야 한다)", async () => {
    const { captured, supabase } = captureInsert();
    await restorePageFromBackup(supabase, backupPage());
    expect(captured.payload?.id).toBe(VALID_ROW.id);
  });

  it("파일의 userId를 믿지 않고 로그인 사용자로 채운다", async () => {
    // 남의 user_id를 실은 파일로 남의 데이터를 만들 수 없어야 한다(RLS와 별개로 계약에서도 막는다).
    const { captured, supabase } = captureInsert();
    await restorePageFromBackup(supabase, backupPage());
    expect(captured.payload?.user_id).toBe("99999999-9999-4999-8999-999999999999");
  });

  it("plain_text를 파일 값이 아니라 본문에서 다시 파생한다", async () => {
    // 손으로 편집된 파일이면 본문과 어긋나 검색 결과가 조용히 틀린다.
    const { captured, supabase } = captureInsert();
    await restorePageFromBackup(supabase, backupPage());
    expect(captured.payload?.plain_text).toBe("안녕");
  });

  it("공개 상태는 복원하지 않는다", async () => {
    // 복원했을 뿐인데 문서가 다시 인터넷에 열리면 안 되고, public_slug는 유일 제약이라
    // 부딪히면 그 페이지가 통째로 건너뛰어진다.
    const { captured, supabase } = captureInsert();
    await restorePageFromBackup(supabase, backupPage());
    expect(captured.payload).not.toHaveProperty("is_public");
    expect(captured.payload).not.toHaveProperty("public_slug");
  });

  it("이미 있으면 성공으로 본다 (멱등 — 두 번 넣어도 안전)", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }) },
      from: () => ({
        insert: async () => ({ error: { code: "23505", message: "duplicate key" } }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    await expect(restorePageFromBackup(supabase, backupPage())).resolves.toBeUndefined();
  });

  it("다른 DB 오류는 삼키지 않는다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: { id: VALID_ROW.user_id } } }) },
      from: () => ({
        insert: async () => ({ error: { code: "23503", message: "foreign key violation" } }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    await expect(restorePageFromBackup(supabase, backupPage())).rejects.toThrow(
      "foreign key violation",
    );
  });

  it("로그인하지 않으면 아무것도 쓰지 않는다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(restorePageFromBackup(supabase, backupPage())).rejects.toThrow(
      "로그인이 필요합니다.",
    );
  });
});

describe("listTrashedPages", () => {
  const TRASHED_ROW = {
    ...VALID_ROW,
    is_trashed: true,
    trashed_at: "2026-07-21T00:00:00.000Z",
  };

  it("휴지통 페이지를 trashed_at 내림차순으로 Page[]로 변환한다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({ limit: async () => ({ data: [TRASHED_ROW], error: null }) }),
          }),
        }),
      }),
    });
    const result = await listTrashedPages(supabase);
    expect(result).toHaveLength(1);
    expect(result[0].isTrashed).toBe(true);
    expect(result[0].trashedAt).toBe(TRASHED_ROW.trashed_at);
  });

  it("DB 에러면 예외를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({ limit: async () => ({ data: null, error: { message: "trash-boom" } }) }),
          }),
        }),
      }),
    });
    await expect(listTrashedPages(supabase)).rejects.toThrow("trash-boom");
  });
});

// 각 함수의 `if (error) throw` 브랜치(에러 전파)를 호출 체인 형태에 맞춰 커버한다.
describe("DB 에러 전파", () => {
  it("searchPages는 limit 단계 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              order: () => ({
                limit: async () => ({ data: null, error: { message: "search-boom" } }),
              }),
            }),
          }),
        }),
      }),
    });
    await expect(searchPages(supabase, "문서")).rejects.toThrow("search-boom");
  });

  it("getPage는 조회 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: { message: "get-boom" } }),
          }),
        }),
      }),
    });
    await expect(getPage(supabase, VALID_ROW.id)).rejects.toThrow("get-boom");
  });

  it("updatePage는 갱신 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: "update-boom" } }),
            }),
          }),
        }),
      }),
    });
    await expect(
      updatePage(supabase, VALID_ROW.id, { title: "x" }),
    ).rejects.toThrow("update-boom");
  });

  it("softDeletePage/restorePage는 update 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        update: () => ({
          eq: () => ({
            then: (resolve: (v: { error: { message: string } }) => void) =>
              resolve({ error: { message: "soft-boom" } }),
          }),
        }),
      }),
    });
    await expect(softDeletePage(supabase, VALID_ROW.id)).rejects.toThrow("soft-boom");
    await expect(restorePage(supabase, VALID_ROW.id)).rejects.toThrow("soft-boom");
  });

  it("purgePage는 delete 에러를 던진다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        delete: () => ({
          eq: async () => ({ error: { message: "purge-boom" } }),
        }),
      }),
    });
    await expect(purgePage(supabase, VALID_ROW.id)).rejects.toThrow("purge-boom");
  });
});
