import { cellKey, type Cell, type CellValue } from "./sheet";

// 2026-08-02 : 스프레드시트 - 범위 정렬 (SPEC-2026-08-02-spreadsheet-a1 T8)
//
// 정렬은 **행을 통째로** 옮긴다. 고른 열만 옮기면 옆 열과 짝이 어긋나 데이터가 조용히
// 뒤섞인다 — 표는 멀쩡해 보이고 되돌릴 수도 없다.
//
// **수식이 있으면 거부한다.** 행이 이사하면 그 안의 상대참조도 따라가야 하는데, 정렬은
// 삽입·삭제와 달리 "어디로 갔는지"가 행마다 달라서 참조를 일관되게 고칠 방법이 없다
// (엑셀도 이 경우 값이 틀어지고, 사용자는 그걸 정렬 탓이라고 생각하지 못한다).
// 조용히 틀린 값을 만드는 대신 막고 사유를 알린다.

export interface SortRange {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

/** 정렬 비교. 숫자끼리는 숫자로, 나머지는 글자로. 빈 칸은 늘 뒤다(엑셀과 같다). */
function compare(a: CellValue, b: CellValue): number {
  const aEmpty = a === null || a === "";
  const bEmpty = b === null || b === "";
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/**
 * 범위 안의 행을 `byCol` 열 기준으로 정렬한 새 셀 목록을 돌려준다.
 * 범위 밖의 셀은 그대로 남는다.
 */
export function sortRange(
  cells: readonly Cell[],
  range: SortRange,
  byCol: number,
  ascending: boolean,
): Cell[] {
  const inside = (cell: Cell): boolean =>
    cell.r >= range.r0 && cell.r <= range.r1 && cell.c >= range.c0 && cell.c <= range.c1;

  const target = cells.filter(inside);
  if (target.some((cell) => cell.f !== null)) {
    throw new Error("수식이 있는 범위는 정렬할 수 없어요. 값만 있는 범위를 골라 주세요.");
  }

  // 행 번호 -> 그 행의 셀들.
  const byRow = new Map<number, Cell[]>();
  for (const cell of target) {
    const list = byRow.get(cell.r) ?? [];
    list.push(cell);
    byRow.set(cell.r, list);
  }

  // 빈 행도 자리를 차지한다 — 값이 있는 행만 모아 정렬하면 빈 줄이 사라져 행이 밀린다.
  const rows: number[] = [];
  for (let r = range.r0; r <= range.r1; r += 1) rows.push(r);

  const keyOf = (r: number): CellValue =>
    byRow.get(r)?.find((cell) => cell.c === byCol)?.v ?? null;

  const sorted = [...rows].sort((a, b) => {
    const cmp = compare(keyOf(a), keyOf(b));
    // 빈 칸은 방향과 무관하게 뒤로 보낸다. 그래서 부호를 뒤집기 전에 빈 칸 판정을 끝낸다.
    const aEmpty = keyOf(a) === null || keyOf(a) === "";
    const bEmpty = keyOf(b) === null || keyOf(b) === "";
    if (aEmpty !== bEmpty) return cmp;
    return ascending ? cmp : -cmp;
  });

  const moved = new Map<string, Cell>();
  sorted.forEach((from, i) => {
    const to = range.r0 + i;
    for (const cell of byRow.get(from) ?? []) {
      moved.set(cellKey(to, cell.c), { ...cell, r: to });
    }
  });

  return [...cells.filter((cell) => !inside(cell)), ...moved.values()];
}
