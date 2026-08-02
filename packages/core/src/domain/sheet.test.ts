import { describe, expect, it } from "vitest";
import {
  MAX_COLS,
  MAX_ROWS,
  cellKey,
  cellSchema,
  colToLetters,
  createDefaultSheetMeta,
  formatCellRef,
  isValidSheetName,
  lettersToCol,
  nextSheetName,
  normalizeRange,
  parseCellInput,
  parseCellRange,
  parseCellRef,
  quoteSheetName,
  rangeCellCount,
  sheetMetaSchema,
  shiftCellRef,
} from "./sheet";

// 2026-08-02 : 스프레드시트 - 계약 - 셀 주소 (SPEC T1)
// 주소 변환이 틀리면 수식·복사붙여넣기·행열삽입·xlsx가 **전부** 같은 방향으로 틀린다.
// 그래서 여기가 이 기능에서 가장 촘촘해야 하는 검사다.

describe("열 인덱스 ↔ 글자", () => {
  it.each([
    [0, "A"],
    [1, "B"],
    [25, "Z"],
    [26, "AA"], // bijective base-26의 첫 자리 넘김 — 일반 진법이면 여기서 틀린다
    [27, "AB"],
    [51, "AZ"],
    [52, "BA"],
    [701, "ZZ"],
    [702, "AAA"],
    [16383, "XFD"], // 엑셀 마지막 열
  ])("%i -> %s", (col, letters) => {
    expect(colToLetters(col)).toBe(letters);
    expect(lettersToCol(letters)).toBe(col);
  });

  it("범위를 벗어난 열은 예외", () => {
    expect(() => colToLetters(-1)).toThrow(RangeError);
    expect(() => colToLetters(MAX_COLS)).toThrow(RangeError);
    expect(() => colToLetters(1.5)).toThrow(RangeError);
  });

  it("알파벳이 아니거나 너무 길면 null", () => {
    expect(lettersToCol("")).toBeNull();
    expect(lettersToCol("A1")).toBeNull();
    expect(lettersToCol("한글")).toBeNull();
    expect(lettersToCol("XFE")).toBeNull(); // 마지막 열 바로 다음
    expect(lettersToCol("AAAA")).toBeNull();
  });

  it("소문자도 읽는다(사용자가 a1로 친다)", () => {
    expect(lettersToCol("aa")).toBe(26);
  });
});

describe("셀 참조 파싱", () => {
  it("상대참조", () => {
    expect(parseCellRef("A1")).toEqual({
      r: 0,
      c: 0,
      absR: false,
      absC: false,
      sheet: null,
    });
  });

  it("절대·혼합 참조의 $ 위치를 구분한다", () => {
    expect(parseCellRef("$A$1")).toMatchObject({ absR: true, absC: true });
    expect(parseCellRef("A$1")).toMatchObject({ absR: true, absC: false });
    expect(parseCellRef("$A1")).toMatchObject({ absR: false, absC: true });
  });

  it("행 번호는 1-based 입력을 0-based로 바꾼다", () => {
    expect(parseCellRef("B10")).toMatchObject({ r: 9, c: 1 });
  });

  it("시트 이름", () => {
    expect(parseCellRef("Sheet2!A1")).toMatchObject({ sheet: "Sheet2", r: 0, c: 0 });
    expect(parseCellRef("'내 시트'!B2")).toMatchObject({ sheet: "내 시트", r: 1, c: 1 });
    expect(parseCellRef("한글시트!A1")).toMatchObject({ sheet: "한글시트" });
  });

  it("이름 안의 작은따옴표는 두 번 쓴 것을 하나로 되돌린다", () => {
    expect(parseCellRef("'oh''s sheet'!A1")).toMatchObject({ sheet: "oh's sheet" });
  });

  it.each(["", "A", "1", "A0", "ZZZZ1", "A1:B2", "=A1", "$$A1", "A1.5"])(
    "형식이 아니면 null: %s",
    (bad) => {
      expect(parseCellRef(bad)).toBeNull();
    },
  );

  it("격자 밖 행은 null", () => {
    expect(parseCellRef(`A${MAX_ROWS}`)).toMatchObject({ r: MAX_ROWS - 1 });
    expect(parseCellRef(`A${MAX_ROWS + 1}`)).toBeNull();
    expect(parseCellRef("A0")).toBeNull();
  });

  it("앞뒤 공백은 허용한다", () => {
    expect(parseCellRef("  A1  ")).toMatchObject({ r: 0, c: 0 });
  });
});

describe("셀 참조 조립 — 파싱과 왕복한다", () => {
  it.each([
    "A1",
    "$A$1",
    "A$1",
    "$A1",
    "XFD1048576",
    "Sheet2!B10",
    "'내 시트'!C3",
    "'oh''s sheet'!A1",
  ])("%s", (text) => {
    const ref = parseCellRef(text);
    expect(ref).not.toBeNull();
    expect(formatCellRef(ref!)).toBe(text);
  });

  it("따옴표는 필요할 때만 붙인다", () => {
    expect(quoteSheetName("Sheet1")).toBe("Sheet1");
    expect(quoteSheetName("한글")).toBe("한글");
    expect(quoteSheetName("내 시트")).toBe("'내 시트'");
    expect(quoteSheetName("a-b")).toBe("'a-b'");
    expect(quoteSheetName("oh's")).toBe("'oh''s'");
  });
});

describe("범위", () => {
  it("A1:B10", () => {
    const range = parseCellRange("A1:B10");
    expect(range?.start).toMatchObject({ r: 0, c: 0 });
    expect(range?.end).toMatchObject({ r: 9, c: 1 });
  });

  it("시트 이름은 시작 쪽에서 읽어 끝에도 전파한다", () => {
    const range = parseCellRange("Sheet2!A1:B2");
    expect(range?.start.sheet).toBe("Sheet2");
    expect(range?.end.sheet).toBe("Sheet2");
  });

  it("양쪽 시트가 다르면 거부한다", () => {
    expect(parseCellRange("Sheet1!A1:Sheet2!B2")).toBeNull();
  });

  it.each(["A1", "A1:", ":B2", "A1:B2:C3"])("형식이 아니면 null: %s", (bad) => {
    // "A1:B2:C3"은 마지막 ':'를 기준으로 잘라 "A1:B2"가 왼쪽이 되는데 그건 셀 참조가 아니라 null.
    expect(parseCellRange(bad)).toBeNull();
  });

  it("거꾸로 끈 범위를 좌상단 기준으로 정규화한다", () => {
    const range = parseCellRange("C5:A1")!;
    const n = normalizeRange(range);
    expect(n.start).toMatchObject({ r: 0, c: 0 });
    expect(n.end).toMatchObject({ r: 4, c: 2 });
  });

  it("셀 개수를 센다", () => {
    expect(rangeCellCount(parseCellRange("A1:A1")!)).toBe(1);
    expect(rangeCellCount(parseCellRange("A1:B10")!)).toBe(20);
    expect(rangeCellCount(parseCellRange("C5:A1")!)).toBe(15); // 거꾸로여도 같다
  });
});

describe("상대참조 이동 (복사붙여넣기·채우기 핸들의 규칙)", () => {
  it("상대참조만 움직인다", () => {
    const a1 = parseCellRef("A1")!;
    expect(formatCellRef(shiftCellRef(a1, 2, 1)!)).toBe("B3");
  });

  it("절대참조는 그 축이 고정된다", () => {
    expect(formatCellRef(shiftCellRef(parseCellRef("$A$1")!, 5, 5)!)).toBe("$A$1");
    expect(formatCellRef(shiftCellRef(parseCellRef("A$1")!, 5, 5)!)).toBe("F$1");
    expect(formatCellRef(shiftCellRef(parseCellRef("$A1")!, 5, 5)!)).toBe("$A6");
  });

  it("격자 밖으로 나가면 null — 0으로 접지 않는다", () => {
    // 접으면 엉뚱한 셀을 가리키는 수식이 조용히 남는다. 호출부가 #REF!로 바꾼다.
    expect(shiftCellRef(parseCellRef("A1")!, -1, 0)).toBeNull();
    expect(shiftCellRef(parseCellRef("A1")!, 0, -1)).toBeNull();
    expect(shiftCellRef(parseCellRef("XFD1")!, 0, 1)).toBeNull();
  });

  it("시트 이름은 이동해도 유지된다", () => {
    expect(formatCellRef(shiftCellRef(parseCellRef("Sheet2!A1")!, 1, 1)!)).toBe(
      "Sheet2!B2",
    );
  });
});

describe("셀 입력 해석", () => {
  it("= 로 시작하면 수식으로 저장하고 계산하지 않는다", () => {
    expect(parseCellInput("=SUM(A1:A2)")).toEqual({ v: null, f: "=SUM(A1:A2)" });
  });

  it("= 한 글자는 수식이 아니라 문자열", () => {
    expect(parseCellInput("=")).toEqual({ v: "=", f: null });
  });

  it("숫자로 읽히면 숫자", () => {
    expect(parseCellInput("42")).toEqual({ v: 42, f: null });
    expect(parseCellInput("-3.5")).toEqual({ v: -3.5, f: null });
    expect(parseCellInput("1e3")).toEqual({ v: 1000, f: null });
    expect(parseCellInput("1,234")).toEqual({ v: 1234, f: null });
  });

  it("숫자처럼 생겼지만 아닌 것은 문자열", () => {
    expect(parseCellInput("1.2.3")).toEqual({ v: "1.2.3", f: null });
    expect(parseCellInput("01-02")).toEqual({ v: "01-02", f: null });
  });

  it("빈 입력·공백은 빈 셀", () => {
    expect(parseCellInput("")).toEqual({ v: null, f: null });
    expect(parseCellInput("   ")).toEqual({ v: null, f: null });
  });

  it("작은따옴표 접두는 문자열 강제(엑셀 규칙)", () => {
    expect(parseCellInput("'42")).toEqual({ v: "42", f: null });
    expect(parseCellInput("'=SUM(A1)")).toEqual({ v: "=SUM(A1)", f: null });
  });

  it("TRUE/FALSE는 불리언", () => {
    expect(parseCellInput("TRUE")).toEqual({ v: true, f: null });
    expect(parseCellInput("FALSE")).toEqual({ v: false, f: null });
    expect(parseCellInput("true")).toEqual({ v: "true", f: null }); // 대문자만
  });
});

describe("스키마", () => {
  it("셀 기본값을 채운다", () => {
    expect(cellSchema.parse({ r: 0, c: 0 })).toEqual({
      r: 0,
      c: 0,
      v: null,
      f: null,
      s: null,
    });
  });

  it("격자 밖 좌표를 거부한다", () => {
    expect(cellSchema.safeParse({ r: -1, c: 0 }).success).toBe(false);
    expect(cellSchema.safeParse({ r: 0, c: MAX_COLS }).success).toBe(false);
    expect(cellSchema.safeParse({ r: 1.5, c: 0 }).success).toBe(false);
  });

  it("무한대·NaN은 값이 될 수 없다", () => {
    // 수식이 만든 Infinity가 그대로 저장되면 JSON 직렬화에서 null로 바뀌어 조용히 값이 사라진다.
    expect(cellSchema.safeParse({ r: 0, c: 0, v: Infinity }).success).toBe(false);
    expect(cellSchema.safeParse({ r: 0, c: 0, v: NaN }).success).toBe(false);
  });

  it("시트 메타 기본값", () => {
    expect(sheetMetaSchema.parse({})).toEqual(createDefaultSheetMeta());
  });
});

describe("시트 이름", () => {
  it.each(["Sheet1", "한글 시트", "a.b", "매출_2026"])("허용: %s", (name) => {
    expect(isValidSheetName(name)).toBe(true);
  });

  it.each(["", "a:b", "a/b", "a\\b", "a?b", "a*b", "a[b]", "'a", "a'", " a", "a "])(
    "거부: %s",
    (name) => {
      expect(isValidSheetName(name)).toBe(false);
    },
  );

  it("다음 시트 이름은 빈 번호를 찾는다", () => {
    expect(nextSheetName([])).toBe("Sheet1");
    expect(nextSheetName(["Sheet1"])).toBe("Sheet2");
    expect(nextSheetName(["Sheet1", "Sheet3"])).toBe("Sheet2"); // 가운데가 비면 그걸 쓴다
  });
});

describe("셀 키", () => {
  it("좌표를 맵 키로", () => {
    expect(cellKey(0, 0)).toBe("0:0");
    expect(cellKey(9, 1)).toBe("9:1");
  });
});
