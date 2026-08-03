import { describe, expect, it } from "vitest";
import { cellKey, createDefaultSheetMeta, type Cell } from "./sheet";
import { adjustFormula, deleteLines, insertLines } from "./sheet-mutate";

// 2026-08-02 : 스프레드시트 - 행·열 삽입삭제 (SPEC-2026-08-02-spreadsheet-a1 T8 / AC-12)
//
// 여기가 틀리면 표는 멀쩡해 보이는데 수식이 **조용히 다른 칸을 가리킨다.** 그래서 참조가
// 따라 이동하는 것뿐 아니라 "지워진 칸을 가리키던 참조는 #REF!가 된다"까지 검사한다.
//
// 복사·붙여넣기(shiftFormulaRefs)와 규칙이 다르다: 거기서는 절대참조($A$1)가 움직이지 않지만,
// 행을 끼워 넣으면 **절대참조도 따라 내려간다**(엑셀과 같다 — 가리키던 칸이 실제로 이사했다).

function cell(r: number, c: number, v: Cell["v"], f: string | null = null): Cell {
  return { r, c, v, f, s: null };
}

describe("adjustFormula — 행 삽입", () => {
  it("삽입 지점 아래의 참조가 내려간다", () => {
    expect(adjustFormula("=A5", { axis: "row", at: 2, delta: 1 })).toBe("=A6");
  });

  it("삽입 지점 위의 참조는 그대로다", () => {
    expect(adjustFormula("=A1", { axis: "row", at: 2, delta: 1 })).toBe("=A1");
  });

  it("절대참조도 따라 내려간다(복사·붙여넣기와 다른 지점)", () => {
    expect(adjustFormula("=$A$5", { axis: "row", at: 2, delta: 1 })).toBe("=$A$6");
  });

  it("범위는 양 끝이 함께 내려간다", () => {
    expect(adjustFormula("=SUM(A5:A9)", { axis: "row", at: 2, delta: 2 })).toBe("=SUM(A7:A11)");
  });

  it("범위 안쪽에 끼워 넣으면 범위가 늘어난다", () => {
    expect(adjustFormula("=SUM(A1:A10)", { axis: "row", at: 5, delta: 1 })).toBe("=SUM(A1:A11)");
  });
});

describe("adjustFormula — 행 삭제", () => {
  it("삭제 지점 아래의 참조가 올라온다", () => {
    expect(adjustFormula("=A5", { axis: "row", at: 1, delta: -1 })).toBe("=A4");
  });

  it("지워진 칸을 가리키던 참조는 #REF!다(옆 칸으로 미끄러지지 않는다)", () => {
    expect(adjustFormula("=A3", { axis: "row", at: 2, delta: -1 })).toBe("=#REF!");
  });

  it("범위가 통째로 지워지면 #REF!다", () => {
    expect(adjustFormula("=SUM(A3:A4)", { axis: "row", at: 2, delta: -2 })).toBe("=SUM(#REF!)");
  });

  it("범위의 일부만 지워지면 범위가 줄어든다", () => {
    expect(adjustFormula("=SUM(A1:A10)", { axis: "row", at: 5, delta: -2 })).toBe("=SUM(A1:A8)");
  });

  it("범위의 앞부분이 지워지면 시작이 삭제 지점으로 당겨진다", () => {
    expect(adjustFormula("=SUM(A3:A10)", { axis: "row", at: 2, delta: -2 })).toBe("=SUM(A3:A8)");
  });
});

describe("adjustFormula — 열", () => {
  it("열 삽입에서 오른쪽 참조가 밀린다", () => {
    expect(adjustFormula("=C1", { axis: "col", at: 1, delta: 1 })).toBe("=D1");
  });

  it("열 삭제에서 지워진 열 참조는 #REF!다", () => {
    expect(adjustFormula("=B1+C1", { axis: "col", at: 1, delta: -1 })).toBe("=#REF!+B1");
  });
});

describe("adjustFormula — 다른 시트", () => {
  it("다른 시트를 가리키는 참조는 건드리지 않는다", () => {
    expect(
      adjustFormula("=Sheet2!A5", { axis: "row", at: 1, delta: 1, sheetName: "Sheet1" }),
    ).toBe("=Sheet2!A5");
  });

  it("같은 시트를 이름으로 가리키면 따라 움직인다", () => {
    expect(
      adjustFormula("=Sheet1!A5", { axis: "row", at: 1, delta: 1, sheetName: "Sheet1" }),
    ).toBe("=Sheet1!A6");
  });
});

describe("mutateSheet — 행 삽입", () => {
  const cells = [cell(0, 0, "머리"), cell(2, 0, 10), cell(3, 0, null, "=A3*2")];

  it("삽입 지점 아래 셀이 내려간다", () => {
    const out = insertLines({
      cells,
      meta: createDefaultSheetMeta(),
      sheetName: "Sheet1",
      axis: "row",
      at: 1,
      count: 1,
    });
    const byKey = new Map(out.cells.map((x) => [cellKey(x.r, x.c), x]));
    expect(byKey.get(cellKey(0, 0))?.v).toBe("머리");
    expect(byKey.get(cellKey(3, 0))?.v).toBe(10);
    // 수식 셀도 내려가고, 그 안의 참조도 따라 내려간다.
    expect(byKey.get(cellKey(4, 0))?.f).toBe("=A4*2");
  });

  it("열 너비·행 높이 예외와 병합도 함께 움직인다", () => {
    const out = insertLines({
      cells: [],
      meta: {
        ...createDefaultSheetMeta(),
        rows: { "3": { h: 40 } },
        merges: ["A4:B4"],
      },
      sheetName: "Sheet1",
      axis: "row",
      at: 1,
      count: 1,
    });
    expect(out.meta.rows).toEqual({ "4": { h: 40 } });
    expect(out.meta.merges).toEqual(["A5:B5"]);
  });
});

describe("mutateSheet — 행 삭제", () => {
  it("지워진 행의 셀은 사라지고 아래가 올라온다", () => {
    const out = deleteLines({
      cells: [cell(0, 0, "머리"), cell(1, 0, "지워짐"), cell(2, 0, "올라옴")],
      meta: createDefaultSheetMeta(),
      sheetName: "Sheet1",
      axis: "row",
      at: 1,
      count: 1,
    });
    const byKey = new Map(out.cells.map((x) => [cellKey(x.r, x.c), x]));
    expect(out.cells).toHaveLength(2);
    expect(byKey.get(cellKey(1, 0))?.v).toBe("올라옴");
  });

  it("지워진 행을 가리키던 수식이 #REF!가 된다", () => {
    const out = deleteLines({
      cells: [cell(1, 0, 5), cell(3, 0, null, "=A2+1")],
      meta: createDefaultSheetMeta(),
      sheetName: "Sheet1",
      axis: "row",
      at: 1,
      count: 1,
    });
    const byKey = new Map(out.cells.map((x) => [cellKey(x.r, x.c), x]));
    expect(byKey.get(cellKey(2, 0))?.f).toBe("=#REF!+1");
  });

  it("삭제 범위에 걸친 병합은 사라진다", () => {
    const out = deleteLines({
      cells: [],
      meta: { ...createDefaultSheetMeta(), merges: ["A2:B2"] },
      sheetName: "Sheet1",
      axis: "row",
      at: 1,
      count: 1,
    });
    expect(out.meta.merges).toEqual([]);
  });
});

describe("mutateSheet — 열", () => {
  it("열을 지우면 오른쪽이 당겨지고 참조가 따라온다", () => {
    const out = deleteLines({
      cells: [cell(0, 1, "지워짐"), cell(0, 2, 7), cell(0, 3, null, "=C1*2")],
      meta: createDefaultSheetMeta(),
      sheetName: "Sheet1",
      axis: "col",
      at: 1,
      count: 1,
    });
    const byKey = new Map(out.cells.map((x) => [cellKey(x.r, x.c), x]));
    expect(byKey.get(cellKey(0, 1))?.v).toBe(7);
    expect(byKey.get(cellKey(0, 2))?.f).toBe("=B1*2");
  });
});
