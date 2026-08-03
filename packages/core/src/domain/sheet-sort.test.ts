import { describe, expect, it } from "vitest";
import { cellKey, type Cell } from "./sheet";
import { sortRange } from "./sheet-sort";

// 2026-08-02 : 스프레드시트 - 범위 정렬 (SPEC-2026-08-02-spreadsheet-a1 T8)
// 정렬은 **행을 통째로** 옮긴다. 한 열만 옮기면 옆 열과 짝이 어긋나 데이터가 조용히 뒤섞인다.

function cell(r: number, c: number, v: Cell["v"], f: string | null = null): Cell {
  return { r, c, v, f, s: null };
}

function map(cells: Cell[]) {
  return new Map(cells.map((x) => [cellKey(x.r, x.c), x]));
}

describe("sortRange", () => {
  const cells = [
    cell(0, 0, "나"),
    cell(0, 1, 2),
    cell(1, 0, "가"),
    cell(1, 1, 1),
    cell(2, 0, "다"),
    cell(2, 1, 3),
  ];

  it("고른 열을 기준으로 행 전체가 함께 옮겨진다", () => {
    const out = map(sortRange(cells, { r0: 0, c0: 0, r1: 2, c1: 1 }, 0, true));
    expect(out.get(cellKey(0, 0))?.v).toBe("가");
    expect(out.get(cellKey(0, 1))?.v).toBe(1);
    expect(out.get(cellKey(2, 0))?.v).toBe("다");
    expect(out.get(cellKey(2, 1))?.v).toBe(3);
  });

  it("내림차순", () => {
    const out = map(sortRange(cells, { r0: 0, c0: 0, r1: 2, c1: 1 }, 1, false));
    expect(out.get(cellKey(0, 1))?.v).toBe(3);
    expect(out.get(cellKey(2, 1))?.v).toBe(1);
  });

  it("숫자는 숫자로, 글자는 글자로 견준다(10이 9보다 크다)", () => {
    const nums = [cell(0, 0, 9), cell(1, 0, 10), cell(2, 0, 1)];
    const out = sortRange(nums, { r0: 0, c0: 0, r1: 2, c1: 0 }, 0, true);
    expect(out.map((x) => x.v)).toEqual([1, 9, 10]);
  });

  it("빈 칸은 늘 뒤로 간다(오름·내림 모두)", () => {
    const withBlank = [cell(0, 0, "나"), cell(2, 0, "가")];
    const asc = sortRange(withBlank, { r0: 0, c0: 0, r1: 2, c1: 0 }, 0, true);
    expect(asc.map((x) => x.v)).toEqual(["가", "나"]);
    expect(asc.map((x) => x.r)).toEqual([0, 1]);
  });

  it("범위 밖의 셀은 건드리지 않는다", () => {
    const out = map(sortRange([...cells, cell(5, 0, "바깥")], { r0: 0, c0: 0, r1: 2, c1: 1 }, 0, true));
    expect(out.get(cellKey(5, 0))?.v).toBe("바깥");
  });

  it("수식이 있는 셀은 정렬하지 않는다(참조가 따라가지 않아 값이 틀어진다)", () => {
    const withFormula = [cell(0, 0, 2), cell(1, 0, null, "=A1")];
    expect(() => sortRange(withFormula, { r0: 0, c0: 0, r1: 1, c1: 0 }, 0, true)).toThrow(
      "수식",
    );
  });
});
