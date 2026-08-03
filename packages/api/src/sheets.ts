import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_CELLS_PER_SHEET,
  cellSchema,
  isValidSheetName,
  sheetMetaSchema,
  sheetSchema,
  type Cell,
  type Sheet,
  type SheetMeta,
} from "@ldd/core";

// 2026-08-02 : 스프레드시트 - 저장 계층 - 읽기·쓰기 (SPEC-2026-08-02-spreadsheet-a1 T5)
//
// 화면(SheetGrid)이 쓰기 시작하면 바꾸기 비싸므로 T5 착수 시점에 잠근다(스펙 6절).
// 여기 있는 것은 네 가지뿐이다 — 시트 목록·시트 생성·셀 전량 읽기·셀 batch 저장.
// 시트 이름 변경·meta 저장(열너비·틀고정)은 T7, 행열 삽입은 T8이 자기 함수를 더한다.

type SheetRow = {
  id: string;
  page_id: string;
  user_id: string;
  name: string;
  position: number;
  meta: unknown;
};

type CellRow = {
  r: number;
  c: number;
  v: unknown;
  f: string | null;
  s: number | null;
};

function fromSheetRow(row: SheetRow): Sheet {
  // meta는 jsonb라 무엇이든 들어올 수 있다(옛 행·손으로 고친 행). 스키마로 통과시키면
  // 빠진 키가 기본값으로 채워져 화면이 undefined를 만나지 않는다.
  return sheetSchema.parse({
    id: row.id,
    pageId: row.page_id,
    name: row.name,
    position: row.position,
    meta: row.meta ?? {},
  });
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user.id;
}

export async function listSheets(
  supabase: SupabaseClient,
  pageId: string,
): Promise<Sheet[]> {
  const { data, error } = await supabase
    .from("sheets")
    .select("id,page_id,user_id,name,position,meta")
    .eq("page_id", pageId)
    .order("position", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as SheetRow[]).map(fromSheetRow);
}

export type CreateSheetInput = {
  pageId: string;
  name?: string;
  position?: number;
};

export async function createSheet(
  supabase: SupabaseClient,
  input: CreateSheetInput,
): Promise<Sheet> {
  const name = input.name ?? "Sheet1";
  // 이름 규칙은 core가 단일 출처다(수식이 이 이름을 그대로 담으므로 `/`·`:`가 들어가면 파싱이 깨진다).
  // 여기서 먼저 걸러 DB 왕복과 raw한 제약 위반 문구를 피한다.
  if (!isValidSheetName(name)) {
    throw new Error("시트 이름에 쓸 수 없는 글자가 있습니다.");
  }
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from("sheets")
    // user_id는 **세션에서** 넣는다. 호출자가 준 값을 쓰면 남의 데이터를 만들 수 있다
    // (RLS가 막긴 하지만 막히는 값을 보내는 것 자체가 계약 위반이다 — memos.ts와 같은 관례).
    .insert({
      page_id: input.pageId,
      user_id: userId,
      name,
      position: input.position ?? 0,
      meta: {},
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromSheetRow(data as SheetRow);
}

/**
 * 시트 메타(열 너비·행 높이·틀 고정·병합·이름 정의·서식 팔레트)를 통째로 저장한다.
 *
 * 셀과 달리 부분 갱신을 하지 않는 이유: 메타는 작고(셀 개수와 무관하다) 한 화면 조작이
 * 여러 키를 동시에 건드린다(열을 끌면 cols가, 서식을 주면 styles가 바뀐다). 통째로 쓰면
 * "어느 키를 보냈나"를 따질 필요가 없다.
 *
 * **보내기 전에 스키마로 검증한다.** 화면에서 열 너비를 0까지 끌어 버리는 것 같은 값이
 * 그대로 나가면 DB는 받아 주고(jsonb라 제약이 없다) 다음에 불러올 때 화면이 깨진다.
 */
export async function updateSheetMeta(
  supabase: SupabaseClient,
  sheetId: string,
  meta: SheetMeta,
): Promise<SheetMeta> {
  const parsed = sheetMetaSchema.parse(meta);
  await requireUserId(supabase);

  const { error } = await supabase
    .from("sheets")
    .update({ meta: parsed, updated_at: new Date().toISOString() })
    .eq("id", sheetId);

  if (error) throw new Error(error.message);
  return parsed;
}

// 한 번에 요청하는 셀 수. 서버가 이보다 적게 줄 수 있다(PostgREST max-rows).
export const CELL_PAGE_SIZE = 2_000;

/**
 * 시트의 셀을 **전부** 읽는다. 계산은 불러온 뒤 core가 한다(값은 저장하지 않는다 — 스펙 D-1).
 *
 * 페이징을 도는 이유: PostgREST는 요청 크기와 무관하게 서버 설정 상한(기본 1000행)에서 응답을
 * 자른다. 한 번만 조회하면 1000셀이 넘는 시트가 **조용히 잘린 채** 화면에 뜬다 — 빈 셀로 보이지
 * 실패로 보이지 않아 알아채기 어렵다. 그래서 "받은 만큼 전진하고 0행이 올 때까지" 돈다
 * (요청한 크기와 비교하면 서버 상한이 우리 페이지 크기보다 작을 때 그대로 속는다).
 * 페이징에는 안정적인 정렬이 필수다 — 정렬 없이 range를 쓰면 페이지끼리 겹치거나 빠진다.
 */
export async function loadSheetCells(
  supabase: SupabaseClient,
  sheetId: string,
): Promise<Cell[]> {
  const out: Cell[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("sheet_cells")
      .select("r,c,v,f,s")
      .eq("sheet_id", sheetId)
      .order("r", { ascending: true })
      .order("c", { ascending: true })
      .range(from, from + CELL_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CellRow[];
    for (const row of rows) {
      out.push(cellSchema.parse(row));
    }
    if (rows.length === 0) break;
    from += rows.length;
    // 상한을 넘는 시트는 애초에 만들어질 수 없지만(스펙 D-1), 여기서 멈추지 않으면
    // 서버가 계속 같은 행을 주는 이상 상황에서 무한 루프가 된다.
    if (out.length >= MAX_CELLS_PER_SHEET) break;
  }

  return out;
}

/**
 * 셀 묶음을 저장한다. **비어 버린 셀은 행을 지운다** — `sheet_cells`는 희소 테이블이라
 * v/f가 모두 null인 행을 남기면 빈 셀에 저장 공간과 조회 비용만 든다.
 *
 * 서식(s)만 남은 셀은 지우지 않는다. 값을 지웠다고 굵게/배경색까지 사라지면 엑셀과 다르다.
 */
export async function saveCells(
  supabase: SupabaseClient,
  sheetId: string,
  cells: readonly Cell[],
): Promise<void> {
  if (cells.length === 0) return;

  for (const cell of cells) {
    // DB 제약(f like '=%')에 걸리면 사용자에게 Postgres 문구가 그대로 보인다. 같은 규칙을
    // 여기서 먼저 확인해 우리 문구로 막는다(core의 parseCellInput이 지키는 불변식이기도 하다).
    if (cell.f !== null && !cell.f.startsWith("=")) {
      throw new Error("수식은 '='로 시작해야 합니다.");
    }
  }

  const userId = await requireUserId(supabase);

  const toUpsert = cells.filter((c) => c.v !== null || c.f !== null || c.s !== null);
  const toDelete = cells.filter((c) => c.v === null && c.f === null && c.s === null);

  if (toUpsert.length > 0) {
    const { error } = await supabase.from("sheet_cells").upsert(
      toUpsert.map((c) => ({
        sheet_id: sheetId,
        user_id: userId,
        r: c.r,
        c: c.c,
        v: c.v,
        f: c.f,
        s: c.s,
      })),
      { onConflict: "sheet_id,r,c" },
    );
    if (error) throw new Error(error.message);
  }

  // 좌표 목록을 한 문장으로 지우려면 or(and(r.eq..,c.eq..),...) 문자열을 조립해야 하는데,
  // 그 조립은 값에 따라 조용히 어긋난다. T5의 삭제는 편집 1건 단위라 묶음이 작다 —
  // 붙여넣기로 수백 셀을 한 번에 비우는 T6에서 필요해지면 그때 한 문장으로 바꾼다.
  for (const cell of toDelete) {
    const { error } = await supabase
      .from("sheet_cells")
      .delete()
      .eq("sheet_id", sheetId)
      .eq("r", cell.r)
      .eq("c", cell.c);
    if (error) throw new Error(error.message);
  }
}
