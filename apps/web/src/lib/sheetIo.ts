import {
  MAX_COLS,
  MAX_ROWS,
  cellKey,
  createFormulaFunctions,
  displayCellText,
  nodeKey,
  parseCellInput,
  recalcAll,
  styleAt,
  type Cell,
  type EvalValue,
  type SheetCells,
  type SheetMeta,
  type Workbook,
} from "@ldd/core";

// 2026-08-02 : 스프레드시트 - 파일 입출력 (SPEC-2026-08-02-spreadsheet-a1 T9)
//
// 시트 ↔ 표(문자열 행렬) 변환. CSV도 xlsx도 결국 이 표를 쓰므로 한 벌만 둔다.
//
// **내보내는 것은 보이는 값이다.** 받는 쪽(엑셀·다른 도구)은 수식 원문이 아니라 결과를
// 기대한다. 그래서 여기서 엔진을 돌려 계산하고 서식까지 입힌 글자를 만든다 — 화면이 보여
// 주는 것과 파일에 담기는 것이 갈라지지 않게 **화면과 같은 함수**(displayCellText)를 쓴다.

/** 시트의 쓰인 범위를 문자열 표로 펼친다. 빈 칸은 빈 문자열로 자리를 지킨다. */
export function sheetToRows(
  sheetName: string,
  cells: readonly Cell[],
  meta: SheetMeta,
  otherSheets?: ReadonlyMap<string, readonly Cell[]>,
): string[][] {
  if (cells.length === 0) return [];

  const toSheetCells = (list: readonly Cell[]): SheetCells => {
    const m: SheetCells = new Map();
    for (const cell of list) m.set(cellKey(cell.r, cell.c), { v: cell.v, f: cell.f });
    return m;
  };
  const wb: Workbook = new Map([[sheetName, toSheetCells(cells)]]);
  for (const [name, list] of otherSheets ?? []) {
    if (name !== sheetName) wb.set(name, toSheetCells(list));
  }
  const values = recalcAll(wb, createFormulaFunctions()).values;

  let maxR = 0;
  let maxC = 0;
  const byKey = new Map<string, Cell>();
  for (const cell of cells) {
    byKey.set(cellKey(cell.r, cell.c), cell);
    if (cell.r > maxR) maxR = cell.r;
    if (cell.c > maxC) maxC = cell.c;
  }

  const rows: string[][] = [];
  for (let r = 0; r <= maxR; r += 1) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c += 1) {
      const cell = byKey.get(cellKey(r, c));
      if (!cell) {
        row.push("");
        continue;
      }
      const value = cell.f ? (values.get(nodeKey(sheetName, r, c)) ?? null) : cell.v;
      row.push(displayCellText(value, styleAt(meta.styles, cell.s)));
    }
    rows.push(row);
  }
  return rows;
}

/**
 * 문자열 표를 셀로. 숫자·불리언·수식 판정은 셀에 직접 친 것과 **같은 규칙**을 쓴다
 * (parseCellInput) — 가져온 표만 다르게 해석되면 사용자는 그 차이를 설명할 수 없다.
 */
export function rowsToCells(
  rows: readonly (readonly string[])[],
  maxCols: number = MAX_COLS,
): Cell[] {
  const out: Cell[] = [];
  rows.forEach((row, r) => {
    if (r >= MAX_ROWS) return;
    row.forEach((raw, c) => {
      if (c >= maxCols) return;
      const input = parseCellInput(raw);
      // 빈 칸은 셀을 만들지 않는다(희소 저장 — 빈 행을 넣으면 저장 공간만 든다).
      if (input.v === null && input.f === null) return;
      out.push({ r, c, v: input.v, f: input.f, s: null });
    });
  });
  return out;
}

/**
 * 여러 시트를 한 번에 계산한다. 키는 core의 nodeKey(`시트!행:열`) 그대로다 —
 * xlsx로 내보낼 때 "이 칸의 계산된 값"을 그 키로 찾는다.
 */
export function computeAll(
  sheets: readonly { name: string; cells: readonly Cell[] }[],
): Map<string, EvalValue> {
  const wb: Workbook = new Map();
  for (const s of sheets) {
    const m: SheetCells = new Map();
    for (const cell of s.cells) m.set(cellKey(cell.r, cell.c), { v: cell.v, f: cell.f });
    wb.set(s.name, m);
  }
  return recalcAll(wb, createFormulaFunctions()).values;
}

/** 내려받을 파일 이름. 파일 시스템이 싫어하는 글자는 밑줄로 바꾼다. */
export function sheetFileName(pageTitle: string, sheetName: string, ext: string): string {
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim();
  const title = safe(pageTitle);
  const sheet = safe(sheetName);
  return `${title ? `${title}-${sheet}` : sheet}.${ext}`;
}
