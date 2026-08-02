import {
  MAX_COLS,
  MAX_ROWS,
  cellKey,
  fillValues,
  parseCellInput,
  parseDelimited,
  shiftFormulaRefs,
  toDelimited,
  type Cell,
} from "@ldd/core";

// 2026-08-02 : 스프레드시트 - 편집 계산 (SPEC-2026-08-02-spreadsheet-a1 T6)
//
// 붙여넣기·채우기·실행취소가 **무엇을 쓸 것인가**를 정하는 결정적 계산이다. 화면(SheetGrid)에서
// 떼어 둔 이유는 두 가지다: DOM 없이 규칙을 확인할 수 있고, 격자 렌더가 바뀌어도 이 규칙은
// 그대로 남는다. 셀 좌표 계산·수식 참조 이동·연속 데이터 판정은 전부 순수 함수다.

export type CellGrid = ReadonlyMap<string, Cell>;

/** 정규화된 범위(좌상단 r0,c0 ~ 우하단 r1,c1). */
export type SheetRange = { r0: number; c0: number; r1: number; c1: number };

export function normalize(a: { r: number; c: number }, b: { r: number; c: number }): SheetRange {
  return {
    r0: Math.min(a.r, b.r),
    c0: Math.min(a.c, b.c),
    r1: Math.max(a.r, b.r),
    c1: Math.max(a.c, b.c),
  };
}

export function inRange(range: SheetRange, r: number, c: number): boolean {
  return r >= range.r0 && r <= range.r1 && c >= range.c0 && c <= range.c1;
}

/** 셀에 사용자가 친 그대로의 문자열(수식이면 원문). 복사·채우기가 원본으로 삼는 값이다. */
export function rawOf(grid: CellGrid, r: number, c: number): string {
  const cell = grid.get(cellKey(r, c));
  if (!cell) return "";
  if (cell.f) return cell.f;
  if (cell.v === null) return "";
  if (typeof cell.v === "boolean") return cell.v ? "TRUE" : "FALSE";
  return String(cell.v);
}

/**
 * 시스템 클립보드에 실을 텍스트. **보이는 값**을 싣는다 — 받는 쪽이 엑셀이면 수식 원문이
 * 아니라 결과를 기대한다(엑셀도 텍스트 클립보드에는 결과를 싣는다). 우리끼리의 복사는
 * 수식을 보존해야 하므로 화면이 원본 셀을 따로 들고 있다가 buildPasteFromCells로 붙인다.
 */
export function buildCopyText(
  range: SheetRange,
  display: (r: number, c: number) => string,
): string {
  const rows: string[][] = [];
  for (let r = range.r0; r <= range.r1; r += 1) {
    const row: string[] = [];
    for (let c = range.c0; c <= range.c1; c += 1) row.push(display(r, c));
    rows.push(row);
  }
  return toDelimited(rows, "\t");
}

/** 복사한 범위를 그대로 담은 블록(행×열). 붙여넣을 때 수식을 옮기려면 원본 좌표가 필요하다. */
export function buildCopyBlock(grid: CellGrid, range: SheetRange): Cell[][] {
  const out: Cell[][] = [];
  for (let r = range.r0; r <= range.r1; r += 1) {
    const row: Cell[] = [];
    for (let c = range.c0; c <= range.c1; c += 1) {
      row.push(grid.get(cellKey(r, c)) ?? { r, c, v: null, f: null, s: null });
    }
    out.push(row);
  }
  return out;
}

function within(r: number, c: number): boolean {
  return r >= 0 && r < MAX_ROWS && c >= 0 && c < MAX_COLS;
}

/** 바깥(엑셀 등)에서 온 구분자 텍스트를 붙여넣는다. 옮길 수식이 없으므로 참조는 그대로다. */
export function buildPasteFromText(text: string, at: { r: number; c: number }): Cell[] {
  const rows = parseDelimited(text, "\t");
  const out: Cell[] = [];
  rows.forEach((row, dr) => {
    row.forEach((raw, dc) => {
      const r = at.r + dr;
      const c = at.c + dc;
      // 격자 밖은 버린다. 접어 넣으면 엉뚱한 칸이 조용히 덮인다.
      if (!within(r, c)) return;
      const input = parseCellInput(raw);
      out.push({ r, c, v: input.v, f: input.f, s: null });
    });
  });
  return out;
}

/**
 * 우리에서 복사한 블록을 붙여넣는다. **상대참조가 옮긴 만큼 따라간다**(AC-5, 시나리오 E2).
 * 서식(s)도 함께 간다 — 엑셀의 기본 붙여넣기가 그렇다.
 */
export function buildPasteFromCells(
  block: readonly (readonly Cell[])[],
  from: { r: number; c: number },
  at: { r: number; c: number },
): Cell[] {
  const dr = at.r - from.r;
  const dc = at.c - from.c;
  const out: Cell[] = [];
  block.forEach((row, i) => {
    row.forEach((src, j) => {
      const r = at.r + i;
      const c = at.c + j;
      if (!within(r, c)) return;
      out.push({
        r,
        c,
        v: src.v,
        f: src.f === null ? null : shiftFormulaRefs(src.f, dr, dc),
        s: src.s,
      });
    });
  });
  return out;
}

/**
 * 채우기 핸들을 `to`까지 끌었을 때 채워지는 셀들. 원본 범위 **바깥**만 돌려준다
 * (범위 안은 건드리지 않는다 — 끌어서 줄이는 동작은 엑셀에서 지우기지만 T6에서는 하지 않는다).
 *
 * 방향은 더 많이 벗어난 축 하나만 잡는다. 대각선으로 끌 때 두 방향을 동시에 채우면
 * 무엇이 채워질지 예측할 수 없다(엑셀도 한 방향만 잡는다).
 */
export function buildFill(
  grid: CellGrid,
  range: SheetRange,
  to: { r: number; c: number },
): Cell[] {
  const downBy = to.r - range.r1;
  const rightBy = to.c - range.c1;
  const vertical = downBy >= rightBy;
  const count = vertical ? downBy : rightBy;
  if (count <= 0) return [];

  const out: Cell[] = [];
  // 세로로 끌면 열마다, 가로로 끌면 행마다 각자의 연속을 만든다.
  const lines = vertical
    ? Array.from({ length: range.c1 - range.c0 + 1 }, (_, i) => range.c0 + i)
    : Array.from({ length: range.r1 - range.r0 + 1 }, (_, i) => range.r0 + i);
  const depth = vertical ? range.r1 - range.r0 + 1 : range.c1 - range.c0 + 1;

  for (const line of lines) {
    const at = (k: number): { r: number; c: number } =>
      vertical ? { r: range.r0 + k, c: line } : { r: line, c: range.c0 + k };

    const source: string[] = [];
    for (let k = 0; k < depth; k += 1) {
      const p = at(k);
      source.push(rawOf(grid, p.r, p.c));
    }
    const series = fillValues(source, count);

    for (let n = 0; n < count; n += 1) {
      const p = vertical
        ? { r: range.r1 + 1 + n, c: line }
        : { r: line, c: range.c1 + 1 + n };
      if (!within(p.r, p.c)) continue;

      // 원본 블록에서 이 칸이 이어받는 셀. 수식은 연속 데이터가 아니라 참조를 옮겨 채운다.
      const srcAt = at(n % depth);
      const src = grid.get(cellKey(srcAt.r, srcAt.c));
      if (src?.f) {
        out.push({
          r: p.r,
          c: p.c,
          v: null,
          f: shiftFormulaRefs(src.f, p.r - srcAt.r, p.c - srcAt.c),
          s: src.s,
        });
        continue;
      }
      const input = parseCellInput(series[n]);
      out.push({ r: p.r, c: p.c, v: input.v, f: input.f, s: src?.s ?? null });
    }
  }
  return out;
}

/**
 * 이 변경을 되돌리는 셀들. 없던 셀은 **빈 셀**로 되돌린다(저장 계층이 행을 지운다).
 * 실행취소는 이 결과를 그대로 다시 쓰는 것뿐이라 별도의 되돌리기 경로가 없다.
 */
export function invert(next: readonly Cell[], grid: CellGrid): Cell[] {
  return next.map(
    (cell) =>
      grid.get(cellKey(cell.r, cell.c)) ?? {
        r: cell.r,
        c: cell.c,
        v: null,
        f: null,
        s: null,
      },
  );
}
