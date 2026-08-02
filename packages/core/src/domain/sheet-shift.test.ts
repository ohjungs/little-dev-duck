import { describe, expect, it } from "vitest";
import { shiftFormulaRefs } from "./sheet-shift";

// 2026-08-02 : 스프레드시트 - 참조 이동 (SPEC-2026-08-02-spreadsheet-a1 T6 / AC-5)
// 복사·붙여넣기와 채우기 핸들이 "수식을 옮기면 상대참조만 따라 움직인다"를 지키는 자리다.
// 여기가 틀리면 붙여넣은 수식이 **조용히 엉뚱한 칸을 가리킨다** — 값은 그럴듯하게 나온다.

describe("shiftFormulaRefs", () => {
  it("상대참조는 옮긴 만큼 따라 움직인다", () => {
    expect(shiftFormulaRefs("=A1+1", 1, 0)).toBe("=A2+1");
    expect(shiftFormulaRefs("=A1+B2", 0, 1)).toBe("=B1+C2");
  });

  it("절대참조는 움직이지 않는다", () => {
    expect(shiftFormulaRefs("=$A$1", 3, 3)).toBe("=$A$1");
  });

  it("혼합참조는 고정하지 않은 축만 움직인다", () => {
    // $A1 — 열 고정, 행만 이동
    expect(shiftFormulaRefs("=$A1", 2, 5)).toBe("=$A3");
    // A$1 — 행 고정, 열만 이동
    expect(shiftFormulaRefs("=A$1", 2, 1)).toBe("=B$1");
  });

  it("범위는 양 끝이 함께 움직인다", () => {
    expect(shiftFormulaRefs("=SUM(A1:A2)", 0, 1)).toBe("=SUM(B1:B2)");
    expect(shiftFormulaRefs("=SUM($A$1:$A$2)", 5, 5)).toBe("=SUM($A$1:$A$2)");
  });

  it("다른 시트 참조도 좌표는 따라 움직인다(시트 이름은 그대로)", () => {
    expect(shiftFormulaRefs("=Sheet2!A1", 1, 0)).toBe("=Sheet2!A2");
  });

  it("격자 밖으로 나가는 참조는 #REF!가 된다(옆 칸을 가리키지 않는다)", () => {
    expect(shiftFormulaRefs("=A1", -1, 0)).toBe("=#REF!");
    expect(shiftFormulaRefs("=A1+B1", 0, -1)).toBe("=#REF!+A1");
    expect(shiftFormulaRefs("=SUM(A1:B2)", -1, 0)).toBe("=SUM(#REF!)");
  });

  it("함수 인자 안쪽까지 들어가 옮긴다", () => {
    expect(shiftFormulaRefs("=IF(A1>0,B1,C1)", 1, 0)).toBe("=IF(A2>0,B2,C2)");
  });

  it("읽을 수 없는 수식은 원문 그대로 둔다(고칠 수 있게 남긴다)", () => {
    expect(shiftFormulaRefs("=SUM(", 1, 0)).toBe("=SUM(");
    expect(shiftFormulaRefs("=1+", 1, 0)).toBe("=1+");
  });

  it("옮길 거리가 0이면 원문을 그대로 돌려준다(재조립으로 모양이 바뀌지 않게)", () => {
    expect(shiftFormulaRefs("=SUM( A1 : A2 )", 0, 0)).toBe("=SUM( A1 : A2 )");
  });

  it("이름 정의는 건드리지 않는다", () => {
    expect(shiftFormulaRefs("=매출*2", 3, 3)).toBe("=매출*2");
  });
});
