import { describe, expect, it } from "vitest";
import type { CellStyle } from "./sheet";
import { alignOf, applyStyle, displayCellText, styleAt } from "./sheet-format";

// 2026-08-02 : 스프레드시트 - 서식 (SPEC-2026-08-02-spreadsheet-a1 T7)
// 서식은 셀마다 들고 있지 않고 **팔레트(meta.styles) 인덱스**로 가리킨다. 같은 서식을 쓰는
// 셀 1만 개가 팔레트 항목 하나를 공유해야 셀 행이 가벼워진다 — 그 중복 제거가 여기 있다.

describe("applyStyle", () => {
  it("서식이 없던 셀에 처음 서식을 주면 팔레트에 하나가 생긴다", () => {
    const out = applyStyle([], null, { bold: true });
    expect(out).toEqual({ styles: [{ bold: true }], index: 0 });
  });

  it("같은 서식을 다시 쓰면 팔레트가 늘지 않고 같은 인덱스를 준다", () => {
    const first = applyStyle([], null, { bold: true })!;
    const second = applyStyle(first.styles, null, { bold: true })!;
    expect(second.styles).toHaveLength(1);
    expect(second.index).toBe(0);
  });

  it("기존 서식 위에 얹으면 합쳐진 새 서식이 된다", () => {
    const bold = applyStyle([], null, { bold: true })!;
    const both = applyStyle(bold.styles, bold.index, { italic: true })!;
    expect(both.styles[both.index!]).toEqual({ bold: true, italic: true });
    // 원래 것도 남는다(다른 셀이 쓰고 있을 수 있다).
    expect(both.styles[0]).toEqual({ bold: true });
  });

  it("끄면 그 속성이 빠진다(false로 남기지 않는다 — 중복 제거가 어긋난다)", () => {
    const bold = applyStyle([], null, { bold: true })!;
    const off = applyStyle(bold.styles, bold.index, { bold: false })!;
    expect(off.index).toBeNull();
  });

  it("속성이 모두 빠지면 인덱스가 null이 된다(기본 서식)", () => {
    const s = applyStyle([], null, { align: "center" })!;
    expect(applyStyle(s.styles, s.index, { align: undefined })!.index).toBeNull();
  });

  it("바꿀 것이 없으면 팔레트도 인덱스도 그대로다", () => {
    const bold = applyStyle([], null, { bold: true })!;
    const same = applyStyle(bold.styles, bold.index, { bold: true })!;
    expect(same.styles).toHaveLength(1);
    expect(same.index).toBe(0);
  });

  it("팔레트가 꽉 차면 null을 돌려준다(조용히 무시하지 않는다)", () => {
    // 512개를 서로 다른 색으로 채운다(스키마 상한).
    const full: CellStyle[] = Array.from({ length: 512 }, (_, i) => ({ color: `c${i}` }));
    expect(applyStyle(full, null, { color: "새것" })).toBeNull();
    // 이미 있는 서식이면 꽉 차 있어도 쓸 수 있다.
    expect(applyStyle(full, null, { color: "c3" })!.index).toBe(3);
  });
});

describe("styleAt", () => {
  it("인덱스가 없거나 범위 밖이면 빈 서식이다", () => {
    expect(styleAt([{ bold: true }], null)).toEqual({});
    expect(styleAt([{ bold: true }], 5)).toEqual({});
    expect(styleAt([{ bold: true }], 0)).toEqual({ bold: true });
  });
});

describe("displayCellText", () => {
  it("서식이 없으면 기본 표시다", () => {
    expect(displayCellText(1234.5, {})).toBe("1234.5");
    expect(displayCellText(true, {})).toBe("TRUE");
    expect(displayCellText(null, {})).toBe("");
  });

  it("부동소수 찌꺼기를 보여주지 않는다", () => {
    expect(displayCellText(0.1 + 0.2, {})).toBe("0.3");
  });

  it("숫자 서식이 있으면 그대로 적용한다", () => {
    expect(displayCellText(1234.5, { numFmt: "#,##0.00" })).toBe("1,234.50");
    expect(displayCellText(0.25, { numFmt: "0.0%" })).toBe("25.0%");
  });

  it("오류값에는 서식을 씌우지 않는다", () => {
    expect(displayCellText("#DIV/0!", { numFmt: "#,##0" })).toBe("#DIV/0!");
  });

  it("문자열에 숫자 서식을 줘도 글자가 깨지지 않는다", () => {
    expect(displayCellText("사과", { numFmt: "#,##0" })).toBe("사과");
  });
});

describe("alignOf", () => {
  it("숫자는 오른쪽, 나머지는 왼쪽이 기본이다(엑셀과 같다)", () => {
    expect(alignOf({}, true)).toBe("right");
    expect(alignOf({}, false)).toBe("left");
  });

  it("서식이 정한 정렬이 기본을 이긴다", () => {
    expect(alignOf({ align: "center" }, true)).toBe("center");
  });
});
