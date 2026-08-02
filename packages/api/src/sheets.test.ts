import { describe, expect, it } from "vitest";
import { createSheet, listSheets, loadSheetCells, saveCells } from "./sheets";

const USER = "22222222-2222-4222-8222-222222222222";
const PAGE = "11111111-1111-4111-8111-111111111111";
const SHEET = "33333333-3333-4333-8333-333333333333";

const SHEET_ROW = {
  id: SHEET,
  page_id: PAGE,
  user_id: USER,
  name: "Sheet1",
  position: 0,
  meta: {},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeSupabase(overrides: Record<string, unknown> = {}): any {
  return {
    auth: { getUser: async () => ({ data: { user: { id: USER } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => ({ range: async () => ({ data: [], error: null }) }),
            then: undefined,
          }),
        }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: SHEET_ROW, error: null }) }),
      }),
    }),
    ...overrides,
  };
}

describe("listSheets", () => {
  it("meta가 빈 객체여도 기본값이 채워진 SheetMeta로 파싱한다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: [SHEET_ROW], error: null }),
          }),
        }),
      }),
    });
    const sheets = await listSheets(supabase, PAGE);
    expect(sheets).toHaveLength(1);
    expect(sheets[0].pageId).toBe(PAGE);
    expect(sheets[0].meta.freeze).toEqual({ r: 0, c: 0 });
    expect(sheets[0].meta.styles).toEqual([]);
  });

  it("조회 실패는 예외로 올린다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    });
    await expect(listSheets(supabase, PAGE)).rejects.toThrow("boom");
  });
});

describe("createSheet", () => {
  it("user_id를 세션에서 주입한다(호출자 입력이 아니라)", async () => {
    let captured: Record<string, unknown> | undefined;
    const supabase = fakeSupabase({
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          captured = row;
          return {
            select: () => ({ single: async () => ({ data: SHEET_ROW, error: null }) }),
          };
        },
      }),
    });
    await createSheet(supabase, { pageId: PAGE, name: "Sheet1" });
    expect(captured?.user_id).toBe(USER);
    expect(captured?.page_id).toBe(PAGE);
  });

  it("로그인하지 않으면 만들지 않는다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      createSheet(supabase, { pageId: PAGE, name: "Sheet1" }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("이름이 시트 이름 규칙에 어긋나면 요청 자체를 보내지 않는다", async () => {
    const supabase = fakeSupabase({
      from: () => {
        throw new Error("요청이 나가면 안 된다");
      },
    });
    await expect(
      createSheet(supabase, { pageId: PAGE, name: "가/나" }),
    ).rejects.toThrow("시트 이름");
  });
});

describe("loadSheetCells", () => {
  function pagedSupabase(pages: unknown[][]) {
    let call = 0;
    const ranges: [number, number][] = [];
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => ({
                range: async (from: number, to: number) => {
                  ranges.push([from, to]);
                  const data = pages[call] ?? [];
                  call += 1;
                  return { data, error: null };
                },
              }),
            }),
          }),
        }),
      }),
    });
    return { supabase, ranges };
  }

  it("한 페이지에 안 들어가는 시트를 끝까지 읽는다(1000행에서 잘리지 않는다)", async () => {
    const first = Array.from({ length: 1000 }, (_, i) => ({
      r: i,
      c: 0,
      v: i,
      f: null,
      s: null,
    }));
    const second = [
      { r: 1000, c: 0, v: "끝", f: null, s: null },
      { r: 1001, c: 0, v: null, f: "=A1+1", s: null },
    ];
    const { supabase, ranges } = pagedSupabase([first, second, []]);

    const cells = await loadSheetCells(supabase, SHEET);

    expect(cells).toHaveLength(1002);
    expect(cells[1001]).toEqual({ r: 1001, c: 0, v: null, f: "=A1+1", s: null });
    // 서버가 요청한 크기보다 적게 주더라도(PostgREST max-rows) 실제로 받은 수만큼만 전진한다.
    expect(ranges[1][0]).toBe(1000);
  });

  it("조회 실패는 예외로 올린다", async () => {
    const supabase = fakeSupabase({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => ({
                range: async () => ({ data: null, error: { message: "boom" } }),
              }),
            }),
          }),
        }),
      }),
    });
    await expect(loadSheetCells(supabase, SHEET)).rejects.toThrow("boom");
  });
});

describe("saveCells", () => {
  function captureSupabase() {
    const upserts: Record<string, unknown>[][] = [];
    const deletes: Record<string, unknown>[] = [];
    const supabase = fakeSupabase({
      from: () => ({
        upsert: async (rows: Record<string, unknown>[]) => {
          upserts.push(rows);
          return { error: null };
        },
        delete: () => {
          const match: Record<string, unknown> = {};
          const chain = {
            eq: (col: string, val: unknown) => {
              match[col] = val;
              return chain;
            },
            then: (resolve: (r: { error: null }) => void) => {
              deletes.push(match);
              resolve({ error: null });
              return Promise.resolve({ error: null });
            },
          };
          return chain;
        },
      }),
    });
    return { supabase, upserts, deletes };
  }

  it("값이 있는 셀은 user_id를 세션에서 채워 upsert한다", async () => {
    const { supabase, upserts } = captureSupabase();
    await saveCells(supabase, SHEET, [{ r: 0, c: 0, v: 10, f: null, s: null }]);
    expect(upserts[0]).toEqual([
      { sheet_id: SHEET, user_id: USER, r: 0, c: 0, v: 10, f: null, s: null },
    ]);
  });

  it("빈 셀(값도 수식도 없음)은 upsert가 아니라 삭제한다", async () => {
    const { supabase, upserts, deletes } = captureSupabase();
    await saveCells(supabase, SHEET, [{ r: 3, c: 2, v: null, f: null, s: null }]);
    expect(upserts).toHaveLength(0);
    expect(deletes).toEqual([{ sheet_id: SHEET, r: 3, c: 2 }]);
  });

  it("빈 셀이라도 서식이 남아 있으면 지우지 않는다", async () => {
    const { supabase, upserts, deletes } = captureSupabase();
    await saveCells(supabase, SHEET, [{ r: 3, c: 2, v: null, f: null, s: 1 }]);
    expect(deletes).toHaveLength(0);
    expect(upserts[0]?.[0]).toMatchObject({ r: 3, c: 2, s: 1 });
  });

  it("저장할 것이 없으면 요청을 보내지 않는다", async () => {
    const supabase = fakeSupabase({
      from: () => {
        throw new Error("요청이 나가면 안 된다");
      },
    });
    await expect(saveCells(supabase, SHEET, [])).resolves.toBeUndefined();
  });

  it("로그인하지 않으면 저장하지 않는다", async () => {
    const supabase = fakeSupabase({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    await expect(
      saveCells(supabase, SHEET, [{ r: 0, c: 0, v: 1, f: null, s: null }]),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("수식이 '='로 시작하지 않으면 DB 제약에 걸리기 전에 막는다", async () => {
    const supabase = fakeSupabase({
      from: () => {
        throw new Error("요청이 나가면 안 된다");
      },
    });
    await expect(
      saveCells(supabase, SHEET, [{ r: 0, c: 0, v: null, f: "SUM(A1)", s: null }]),
    ).rejects.toThrow("수식");
  });
});
