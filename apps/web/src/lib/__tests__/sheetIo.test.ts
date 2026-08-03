import { describe, expect, it } from "vitest";
import { createDefaultSheetMeta, type Cell } from "@ldd/core";
import { rowsToCells, sheetFileName, sheetToRows } from "@/lib/sheetIo";

// 2026-08-02 : 스프레드시트 - 파일 입출력 (SPEC-2026-08-02-spreadsheet-a1 T9 / AC-18)
// 내보내는 것은 **보이는 값**이다(받는 쪽이 엑셀이면 수식 원문이 아니라 결과를 기대한다).
// 계산은 core 엔진이 하고, 여기서는 표 모양으로 펼치기만 한다.

function cell(r: number, c: number, v: Cell["v"], f: string | null = null): Cell {
  return { r, c, v, f, s: null };
}

describe("sheetToRows", () => {
  it("쓰인 범위만큼의 표를 만든다(빈 칸은 빈 문자열)", () => {
    const rows = sheetToRows("Sheet1", [cell(0, 0, "가"), cell(1, 2, 3)], createDefaultSheetMeta());
    expect(rows).toEqual([
      ["가", "", ""],
      ["", "", "3"],
    ]);
  });

  it("수식은 계산된 값으로 나간다", () => {
    const cells = [cell(0, 0, 10), cell(0, 1, 20), cell(0, 2, null, "=SUM(A1:B1)")];
    expect(sheetToRows("Sheet1", cells, createDefaultSheetMeta())[0]).toEqual([
      "10",
      "20",
      "30",
    ]);
  });

  it("숫자 서식이 있으면 그대로 반영한다", () => {
    const meta = { ...createDefaultSheetMeta(), styles: [{ numFmt: "#,##0" }] };
    const rows = sheetToRows("Sheet1", [{ r: 0, c: 0, v: 1234, f: null, s: 0 }], meta);
    expect(rows[0][0]).toBe("1,234");
  });

  it("다른 시트 참조도 계산된다", () => {
    const rows = sheetToRows(
      "Sheet1",
      [cell(0, 0, null, "=Sheet2!A1*2")],
      createDefaultSheetMeta(),
      new Map([["Sheet2", [cell(0, 0, 21)]]]),
    );
    expect(rows[0][0]).toBe("42");
  });

  it("빈 시트는 빈 표다", () => {
    expect(sheetToRows("Sheet1", [], createDefaultSheetMeta())).toEqual([]);
  });
});

describe("rowsToCells", () => {
  it("표를 셀로 바꾼다(숫자·수식 판정은 셀 입력 규칙을 따른다)", () => {
    expect(rowsToCells([["1", "가"], ["=A1+1", ""]])).toEqual([
      { r: 0, c: 0, v: 1, f: null, s: null },
      { r: 0, c: 1, v: "가", f: null, s: null },
      { r: 1, c: 0, v: null, f: "=A1+1", s: null },
    ]);
  });

  it("격자 상한을 넘는 부분은 버린다(접어 넣지 않는다)", () => {
    const wide = [Array.from({ length: 3 }, () => "x")];
    // 상한을 2로 두면 세 번째 칸은 갈 곳이 없다.
    expect(rowsToCells(wide, 2)).toHaveLength(2);
  });
});

describe("sheetFileName", () => {
  it("페이지 제목과 시트 이름을 붙이고 파일 이름에 못 쓰는 글자를 바꾼다", () => {
    expect(sheetFileName("분기/보고", "Sheet1", "csv")).toBe("분기_보고-Sheet1.csv");
  });

  it("제목이 비면 시트 이름만 쓴다", () => {
    expect(sheetFileName("", "매출", "csv")).toBe("매출.csv");
  });
});
