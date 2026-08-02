import { z } from "zod";

// 2026-08-02 : 스프레드시트 - 계약 - 셀 주소·저장 스키마 (SPEC-2026-08-02-spreadsheet-a1 T1)
//
// 데이터베이스 뷰(database-view.ts)와 **다른 자료구조**다. 저기는 레코드 모델(행 = 자식 페이지,
// 값 = row_props)이고 여기는 격자 모델(셀 = 좌표, 셀이 셀을 참조)이다. 표처럼 보인다고 합치면
// 둘 다 망가진다 — 스펙 1절의 대조표 참조.
//
// 저장은 셀 전용 테이블(sheets + sheet_cells)이다(사용자 결정 Q1). 이 파일은 그 테이블에
// 실리는 값의 계약과, 셀 주소 문자열("A1", "$A$1", "Sheet2!A1:B10")의 파싱·조립을 담는다.
// **주소 변환이 여기 있는 이유**: 수식 파서·복사붙여넣기·행열 삽입·xlsx 입출력이 전부 같은
// 규칙을 쓴다. 네 곳이 각자 정규식을 들면 하나가 틀렸을 때 나머지 셋과 조용히 어긋난다.

// ── 격자 한계 ──────────────────────────────────────────────────────────────
// 주소가 가리킬 수 있는 최대 범위는 엑셀과 같게 둔다(xlsx를 읽을 때 범위 밖 주소를 만나면
// 파일을 통째로 거부하는 대신 그 셀만 #REF!로 떨어뜨릴 수 있게 — 관대하게 읽고 엄격하게 쓴다).
export const MAX_ROWS = 1_048_576; // 엑셀과 동일
export const MAX_COLS = 16_384; // 엑셀과 동일 (A..XFD)

// 실제로 **저장**을 허용하는 상한(스펙 D-1). 주소 한계와 다르다 — 위는 "가리킬 수 있는가",
// 아래는 "우리 DB에 넣어도 되는가"다.
export const MAX_CELLS_PER_SHEET = 1_000_000;
export const MAX_SHEETS_PER_PAGE = 50;
export const MAX_FORMULA_LENGTH = 8_192;
export const MAX_CELL_TEXT_LENGTH = 32_767; // 엑셀 셀 문자열 상한과 동일
export const MAX_SHEET_NAME_LENGTH = 100;

// ── 열 인덱스 ↔ 글자 ────────────────────────────────────────────────────────
// 0 -> "A", 25 -> "Z", 26 -> "AA". 26진법이지만 **0에 해당하는 글자가 없는** bijective base-26이라
// 일반 진법 변환을 그대로 쓰면 "AA" 자리에서 어긋난다. 매 자리에서 1을 먼저 빼는 이유가 그것이다.
export function colToLetters(col: number): string {
  if (!Number.isInteger(col) || col < 0 || col >= MAX_COLS) {
    throw new RangeError(`열 인덱스가 범위를 벗어났습니다: ${col}`);
  }
  let n = col + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

// "A" -> 0, "aa" -> 26. 알파벳이 아닌 글자가 섞이면 null(예외가 아니라 null —
// 사용자가 입력한 문자열을 파싱하는 경로라 실패가 정상 흐름이다).
export function lettersToCol(letters: string): number | null {
  if (letters.length === 0 || letters.length > 3) return null;
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) return null;
    n = n * 26 + (code - 64);
  }
  const col = n - 1;
  return col < MAX_COLS ? col : null;
}

// ── 셀 참조 ────────────────────────────────────────────────────────────────
// r/c는 **0-based**로 통일한다(DB 컬럼과 같은 값이 그대로 들어간다). 화면에 보이는 행 번호는
// r + 1이다. 여기서 1-based를 쓰면 DB·수식·화면 사이에서 ±1 실수가 반복된다.
export interface CellRef {
  r: number;
  c: number;
  /** 행이 절대참조($1)인가 */
  absR: boolean;
  /** 열이 절대참조($A)인가 */
  absC: boolean;
  /** 다른 시트 참조면 그 이름. 같은 시트면 null */
  sheet: string | null;
}

export interface CellRange {
  start: CellRef;
  end: CellRef;
}

// 시트 이름 + A1. 작은따옴표로 감싼 이름('내 시트'!A1)은 공백·특수문자를 포함할 수 있고,
// 이름 안의 작은따옴표는 두 번 써서 이스케이프한다(엑셀 규칙).
const REF_RE =
  /^(?:(?:'((?:[^']|'')+)'|([A-Za-z0-9_가-힣][A-Za-z0-9_.가-힣]*))!)?(\$?)([A-Za-z]{1,3})(\$?)([0-9]{1,7})$/;

/** "A1" · "$A$1" · "Sheet2!A1" · "'내 시트'!A1"을 파싱한다. 형식이 아니면 null. */
export function parseCellRef(text: string): CellRef | null {
  const m = REF_RE.exec(text.trim());
  if (!m) return null;
  const [, quoted, plain, absC, letters, absR, digits] = m;
  const c = lettersToCol(letters);
  if (c === null) return null;
  const row1 = Number(digits);
  if (!Number.isInteger(row1) || row1 < 1 || row1 > MAX_ROWS) return null;
  const sheet = quoted !== undefined ? quoted.replace(/''/g, "'") : (plain ?? null);
  return { r: row1 - 1, c, absR: absR === "$", absC: absC === "$", sheet };
}

/** CellRef를 다시 문자열로. parseCellRef와 왕복해야 한다(테스트로 잠근다). */
export function formatCellRef(ref: CellRef): string {
  const body = `${ref.absC ? "$" : ""}${colToLetters(ref.c)}${ref.absR ? "$" : ""}${ref.r + 1}`;
  if (!ref.sheet) return body;
  return `${quoteSheetName(ref.sheet)}!${body}`;
}

// 따옴표가 필요한지 판정한다. 영숫자·밑줄·한글로만 이뤄지고 숫자로 시작하지 않으면 그대로 쓴다.
export function quoteSheetName(name: string): string {
  if (/^[A-Za-z_가-힣][A-Za-z0-9_.가-힣]*$/.test(name)) return name;
  return `'${name.replace(/'/g, "''")}'`;
}

/** "A1:B10" · "Sheet2!A1:B10"을 파싱한다. 시트 이름은 시작 쪽만 읽는다(엑셀과 같다). */
export function parseCellRange(text: string): CellRange | null {
  const idx = text.lastIndexOf(":");
  if (idx <= 0) return null;
  const left = text.slice(0, idx);
  const right = text.slice(idx + 1);
  const start = parseCellRef(left);
  if (!start) return null;
  // 오른쪽에 시트 이름이 붙어 있으면(Sheet1!A1:Sheet1!B2) 시트가 같을 때만 받는다.
  const end = parseCellRef(right.includes("!") ? right : right);
  if (!end) return null;
  if (end.sheet !== null && end.sheet !== start.sheet) return null;
  return { start, end: { ...end, sheet: start.sheet } };
}

/** 범위를 정규화한다 — 어느 모서리에서 끌었든 start가 좌상단이 되게. */
export function normalizeRange(range: CellRange): CellRange {
  const { start, end } = range;
  return {
    start: {
      ...start,
      r: Math.min(start.r, end.r),
      c: Math.min(start.c, end.c),
    },
    end: { ...end, r: Math.max(start.r, end.r), c: Math.max(start.c, end.c) },
  };
}

/** 범위가 품는 셀 개수. 화면·수식이 큰 범위를 순회하기 전에 미리 재는 용도. */
export function rangeCellCount(range: CellRange): number {
  const n = normalizeRange(range);
  return (n.end.r - n.start.r + 1) * (n.end.c - n.start.c + 1);
}

/** DB 키로 쓰는 문자열("r:c"). 맵 키가 필요할 때 주소 문자열 대신 이걸 쓴다(파싱 왕복 없음). */
export function cellKey(r: number, c: number): string {
  return `${r}:${c}`;
}

// ── 상대참조 이동 ───────────────────────────────────────────────────────────
// 복사·붙여넣기와 채우기 핸들의 핵심 규칙: **절대참조가 아닌 축만** 이동한다.
// 이동 결과가 격자 밖으로 나가면 null — 호출부가 #REF!로 바꾼다(조용히 0행 0열로 접히면
// 엉뚱한 셀을 가리키는 수식이 남는다).
export function shiftCellRef(
  ref: CellRef,
  dr: number,
  dc: number,
): CellRef | null {
  const r = ref.absR ? ref.r : ref.r + dr;
  const c = ref.absC ? ref.c : ref.c + dc;
  if (r < 0 || r >= MAX_ROWS || c < 0 || c >= MAX_COLS) return null;
  return { ...ref, r, c };
}

// ── 셀 값 ──────────────────────────────────────────────────────────────────
// 저장되는 것은 **입력된 값**(v)과 **수식 원문**(f)뿐이다. 계산 결과는 저장하지 않는다 —
// 저장하면 다른 기기의 편집이나 함수 구현 변경으로 실제 값과 어긋나는 순간이 오고, 그 어긋남은
// "틀린 숫자가 맞는 것처럼 보이는" 형태로 나타난다(스펙 D-1).
export const cellValueSchema = z.union([
  z.string().max(MAX_CELL_TEXT_LENGTH),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
export type CellValue = z.infer<typeof cellValueSchema>;

export const cellSchema = z.object({
  r: z.number().int().min(0).max(MAX_ROWS - 1),
  c: z.number().int().min(0).max(MAX_COLS - 1),
  v: cellValueSchema.default(null),
  // '=' 로 시작하는 원문. null이면 값 셀이다.
  f: z.string().max(MAX_FORMULA_LENGTH).nullable().default(null),
  // meta.styles 인덱스. null이면 기본 서식.
  s: z.number().int().min(0).nullable().default(null),
});
export type Cell = z.infer<typeof cellSchema>;

// ── 시트 메타 ──────────────────────────────────────────────────────────────
// 셀에 비해 작고 통째로 읽고 쓰는 값들만 여기 둔다(열 너비·행 높이·틀 고정·병합·이름 정의·서식).
// 셀 개수만큼 커지는 것은 절대 넣지 않는다 — 그러면 jsonb 한 덩어리 문제가 되돌아온다.
export const cellStyleSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  // 화면 색은 UI가 정한다(core는 플랫폼 중립) — 여기서는 토큰 이름만 받는다.
  color: z.string().max(32).optional(),
  bg: z.string().max(32).optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  // 숫자 서식 코드(엑셀 호환 문자열). 해석은 T7의 sheet-format이 맡는다.
  numFmt: z.string().max(64).optional(),
});
export type CellStyle = z.infer<typeof cellStyleSchema>;

export const sheetMetaSchema = z.object({
  // 열 너비·행 높이는 기본값과 다른 것만 담는다(희소).
  cols: z.record(z.string(), z.object({ w: z.number().min(8).max(2000) })).default({}),
  rows: z.record(z.string(), z.object({ h: z.number().min(8).max(1000) })).default({}),
  merges: z.array(z.string().max(32)).max(1000).default([]),
  freeze: z.object({ r: z.number().int().min(0), c: z.number().int().min(0) }).default({ r: 0, c: 0 }),
  // 이름 정의: 이름 -> "Sheet1!A1:A10"
  names: z.record(z.string().max(64), z.string().max(128)).default({}),
  styles: z.array(cellStyleSchema).max(512).default([]),
});
export type SheetMeta = z.infer<typeof sheetMetaSchema>;

export const sheetSchema = z.object({
  id: z.string().min(1),
  pageId: z.string().min(1),
  name: z.string().min(1).max(MAX_SHEET_NAME_LENGTH),
  position: z.number().int().min(0),
  meta: sheetMetaSchema,
});
export type Sheet = z.infer<typeof sheetSchema>;

export function createDefaultSheetMeta(): SheetMeta {
  return { cols: {}, rows: {}, merges: [], freeze: { r: 0, c: 0 }, names: {}, styles: [] };
}

/** 새 문서의 첫 시트 이름. 엑셀처럼 Sheet1, Sheet2... 로 이어 붙인다. */
export function nextSheetName(existing: readonly string[]): string {
  const used = new Set(existing);
  for (let i = 1; i <= MAX_SHEETS_PER_PAGE + 1; i += 1) {
    const name = `Sheet${i}`;
    if (!used.has(name)) return name;
  }
  return `Sheet${existing.length + 1}`;
}

// 시트 이름 규칙(엑셀과 같게): 비어 있지 않고, `: \ / ? * [ ]`를 못 쓰고, 작은따옴표로 시작·끝날 수
// 없다. 이름이 수식에 그대로 들어가므로 여기서 막지 않으면 파싱이 깨진다.
const FORBIDDEN_SHEET_NAME = /[:\\/?*[\]]/;

export function isValidSheetName(name: string): boolean {
  if (name.length === 0 || name.length > MAX_SHEET_NAME_LENGTH) return false;
  if (FORBIDDEN_SHEET_NAME.test(name)) return false;
  if (name.startsWith("'") || name.endsWith("'")) return false;
  return name.trim() === name;
}

// ── 셀 입력 해석 ────────────────────────────────────────────────────────────
// 사용자가 셀에 친 문자열을 저장 형태로 바꾼다. **여기서 수식을 계산하지 않는다** —
// 계산은 평가기의 일이고, 이 함수는 "무엇으로 저장할 것인가"만 정한다.
export interface CellInput {
  v: CellValue;
  f: string | null;
}

export function parseCellInput(raw: string): CellInput {
  // '=' 로 시작하면 수식. 앞뒤 공백은 남긴다 — 수식 원문은 사용자가 쓴 그대로 보존한다.
  if (raw.startsWith("=") && raw.length > 1) {
    return { v: null, f: raw };
  }
  const trimmed = raw.trim();
  if (trimmed === "") return { v: null, f: null };
  // 작은따옴표 접두는 "문자열로 강제"다(엑셀 규칙) — 접두만 떼고 나머지를 문자열로 둔다.
  if (trimmed.startsWith("'")) return { v: trimmed.slice(1), f: null };
  if (trimmed === "TRUE" || trimmed === "FALSE") {
    return { v: trimmed === "TRUE", f: null };
  }
  // 숫자로 읽히면 숫자. 천 단위 구분 쉼표는 받는다(1,234) — 엑셀도 받는다.
  // 앞뒤 공백만 있는 문자열이 0이 되지 않도록 trimmed를 쓴다.
  const numeric = trimmed.replace(/,/g, "");
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(numeric)) {
    const n = Number(numeric);
    if (Number.isFinite(n)) return { v: n, f: null };
  }
  return { v: trimmed, f: null };
}
