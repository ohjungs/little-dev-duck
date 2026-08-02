import { describe, expect, it } from "vitest";
import { cellKey, type Cell } from "@ldd/core";
import {
  buildCopyBlock,
  buildCopyText,
  buildFill,
  buildPasteFromCells,
  buildPasteFromText,
  invert,
  type CellGrid,
} from "@/lib/sheetEdit";

// 2026-08-02 : 스프레드시트 - 편집 계산 (SPEC-2026-08-02-spreadsheet-a1 T6)
// 붙여넣기·채우기·실행취소가 "무엇을 쓸 것인가"를 정하는 결정적 계산이다. 화면과 떼어 두면
// DOM 없이 확인할 수 있고, 격자 렌더가 바뀌어도 이 규칙은 그대로 남는다.

function cell(r: number, c: number, v: Cell["v"], f: string | null = null): Cell {
  return { r, c, v, f, s: null };
}

function grid(cells: Cell[]): CellGrid {
  return new Map(cells.map((x) => [cellKey(x.r, x.c), x]));
}

describe("buildCopyText", () => {
  it("범위를 보이는 값으로 이어 붙인다(엑셀에 붙일 것이므로 수식이 아니라 결과)", () => {
    const display = (r: number, c: number) => `${r}${c}`;
    expect(buildCopyText({ r0: 0, c0: 0, r1: 1, c1: 1 }, display)).toBe("00\t01\n10\t11");
  });
});

describe("buildCopyBlock", () => {
  it("범위 안의 빈 칸도 빈 셀로 자리를 채운다(붙여넣을 때 옛 값이 남지 않게)", () => {
    const g = grid([cell(0, 0, 1)]);
    expect(buildCopyBlock(g, { r0: 0, c0: 0, r1: 0, c1: 1 })).toEqual([
      [cell(0, 0, 1), cell(0, 1, null)],
    ]);
  });
});

describe("buildPasteFromText — 엑셀에서 온 TSV", () => {
  it("붙여넣는 칸을 좌상단으로 표가 들어온다", () => {
    const out = buildPasteFromText("1\t2\n3\t4", { r: 2, c: 1 });
    expect(out).toEqual([
      cell(2, 1, 1),
      cell(2, 2, 2),
      cell(3, 1, 3),
      cell(3, 2, 4),
    ]);
  });

  it("숫자·불리언·수식 판정은 셀 입력 규칙을 그대로 쓴다", () => {
    const out = buildPasteFromText("=1+2\tTRUE\t텍스트", { r: 0, c: 0 });
    expect(out[0]).toEqual({ r: 0, c: 0, v: null, f: "=1+2", s: null });
    expect(out[1]).toEqual(cell(0, 1, true));
    expect(out[2]).toEqual(cell(0, 2, "텍스트"));
  });

  it("빈 칸도 셀로 만든다(붙여넣은 자리의 옛 값이 남지 않는다)", () => {
    const out = buildPasteFromText("a\t\tc", { r: 0, c: 0 });
    expect(out[1]).toEqual(cell(0, 1, null));
  });

  it("격자 밖으로 넘치는 부분은 버린다", () => {
    const out = buildPasteFromText("a\tb", { r: 0, c: 16_383 });
    expect(out).toHaveLength(1);
  });
});

describe("buildPasteFromCells — 우리에서 복사한 것", () => {
  it("수식의 상대참조가 붙여넣는 위치만큼 따라 이동한다 (E2)", () => {
    const block = [[cell(2, 0, null, "=SUM(A1:A2)")]];
    const out = buildPasteFromCells(block, { r: 2, c: 0 }, { r: 2, c: 1 });
    expect(out).toEqual([{ r: 2, c: 1, v: null, f: "=SUM(B1:B2)", s: null }]);
  });

  it("값 셀은 그대로 옮겨진다", () => {
    const block = [[cell(0, 0, 7)]];
    expect(buildPasteFromCells(block, { r: 0, c: 0 }, { r: 5, c: 5 })).toEqual([cell(5, 5, 7)]);
  });

  it("서식은 함께 따라간다", () => {
    const block = [[{ r: 0, c: 0, v: 1, f: null, s: 3 }]];
    expect(buildPasteFromCells(block, { r: 0, c: 0 }, { r: 1, c: 0 })[0].s).toBe(3);
  });
});

describe("buildFill — 아래로 끌기", () => {
  it("숫자 두 개를 끌면 등차로 이어진다", () => {
    const g = grid([cell(0, 0, 1), cell(1, 0, 2)]);
    const out = buildFill(g, { r0: 0, c0: 0, r1: 1, c1: 0 }, { r: 4, c: 0 });
    expect(out).toEqual([cell(2, 0, 3), cell(3, 0, 4), cell(4, 0, 5)]);
  });

  it("수식은 연속 데이터가 아니라 참조를 옮겨 채운다", () => {
    const g = grid([cell(0, 2, null, "=A1*B1")]);
    const out = buildFill(g, { r0: 0, c0: 2, r1: 0, c1: 2 }, { r: 2, c: 2 });
    expect(out).toEqual([
      { r: 1, c: 2, v: null, f: "=A2*B2", s: null },
      { r: 2, c: 2, v: null, f: "=A3*B3", s: null },
    ]);
  });

  it("요일은 다음 요일로 이어진다", () => {
    const g = grid([cell(0, 0, "월")]);
    const out = buildFill(g, { r0: 0, c0: 0, r1: 0, c1: 0 }, { r: 2, c: 0 });
    expect(out.map((x) => x.v)).toEqual(["화", "수"]);
  });

  it("열이 여럿이면 열마다 따로 이어간다", () => {
    const g = grid([cell(0, 0, 1), cell(0, 1, 10), cell(1, 0, 2), cell(1, 1, 20)]);
    const out = buildFill(g, { r0: 0, c0: 0, r1: 1, c1: 1 }, { r: 2, c: 1 });
    expect(out).toEqual([cell(2, 0, 3), cell(2, 1, 30)]);
  });
});

describe("buildFill — 옆으로 끌기", () => {
  it("오른쪽으로 끌면 행마다 이어간다", () => {
    const g = grid([cell(0, 0, 1), cell(0, 1, 2)]);
    const out = buildFill(g, { r0: 0, c0: 0, r1: 0, c1: 1 }, { r: 0, c: 3 });
    expect(out).toEqual([cell(0, 2, 3), cell(0, 3, 4)]);
  });

  it("옆으로 끈 수식은 열 방향으로 참조가 옮겨진다", () => {
    const g = grid([cell(2, 0, null, "=A1+1")]);
    const out = buildFill(g, { r0: 2, c0: 0, r1: 2, c1: 0 }, { r: 2, c: 1 });
    expect(out).toEqual([{ r: 2, c: 1, v: null, f: "=B1+1", s: null }]);
  });

  it("범위 안쪽으로 끌면(줄이면) 아무것도 채우지 않는다", () => {
    const g = grid([cell(0, 0, 1), cell(1, 0, 2)]);
    expect(buildFill(g, { r0: 0, c0: 0, r1: 1, c1: 0 }, { r: 0, c: 0 })).toEqual([]);
  });
});

describe("invert — 실행취소용 되돌림 값", () => {
  it("있던 셀은 옛 값으로, 없던 셀은 빈 셀로 되돌린다", () => {
    const g = grid([cell(0, 0, "옛값")]);
    const next = [cell(0, 0, "새값"), cell(0, 1, "새로 생김")];
    expect(invert(next, g)).toEqual([cell(0, 0, "옛값"), cell(0, 1, null)]);
  });

  it("되돌림의 되돌림은 원래 값이다", () => {
    const g = grid([cell(0, 0, "옛값")]);
    const next = [cell(0, 0, "새값")];
    const back = invert(next, g);
    expect(invert(back, grid(next))).toEqual(next);
  });
});
