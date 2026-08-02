import { describe, expect, it } from "vitest";
import type { EvalResult } from "./formula-eval";
import { evaluate } from "./formula-eval";
import { createFormulaFunctions, formatValue, formulaFunctionNames } from "./formula-fns";
import { parseFormula } from "./formula-parse";
import type { CellRange, CellRef, CellValue } from "./sheet";

// 2026-08-02 : 스프레드시트 - 수식 - 함수 1차 (SPEC T4)
// **엑셀과 다른 답이 나오는 것이 가장 나쁘다** — 틀린 것을 맞다고 믿게 만든다.
// 그래서 여기 검사는 "돌아간다"가 아니라 "엑셀과 같은 값인가"를 본다.
// 고정 시각을 주입해 TODAY/NOW 검사가 시간에 따라 흔들리지 않게 한다.

const FIXED = new Date("2026-08-02T01:23:45Z"); // KST 10:23:45
const fns = createFormulaFunctions({ now: () => FIXED });

/** 셀 격자를 주고 수식을 계산한다. A1이 grid[0][0]이다. */
function run(src: string, grid: CellValue[][] = []): EvalResult {
  const parsed = parseFormula(src);
  if (!parsed.ok) throw new Error(`파싱 실패: ${src} — ${parsed.message}`);
  const at = (r: number, c: number): CellValue => grid[r]?.[c] ?? null;
  return evaluate(parsed.ast, {
    getCell: (ref: CellRef) => at(ref.r, ref.c),
    getRange: (range: CellRange) => {
      const out: CellValue[][] = [];
      for (let r = range.start.r; r <= range.end.r; r += 1) {
        const row: CellValue[] = [];
        for (let c = range.start.c; c <= range.end.c; c += 1) row.push(at(r, c));
        out.push(row);
      }
      return out;
    },
    functions: fns,
  });
}

describe("수학", () => {
  it.each([
    ["=SUM(1,2,3)", 6],
    ["=PRODUCT(2,3,4)", 24],
    ["=ABS(-5)", 5],
    ["=INT(2.9)", 2],
    ["=INT(-2.1)", -3], // 엑셀의 INT는 내림이다(0 방향 절사가 아니다)
    ["=SQRT(9)", 3],
    ["=POWER(2,10)", 1024],
  ])("%s = %s", (src, want) => {
    expect(run(src)).toBe(want);
  });

  it("MOD는 나누는 수의 부호를 따른다 — JS의 %와 다르다", () => {
    // JS: -1 % 3 === -1. 엑셀: MOD(-1,3) = 2.
    expect(run("=MOD(-1,3)")).toBe(2);
    expect(run("=MOD(1,-3)")).toBe(-2);
    expect(run("=MOD(5,3)")).toBe(2);
  });

  it("0으로 나누는 MOD는 #DIV/0!", () => {
    expect(run("=MOD(1,0)")).toBe("#DIV/0!");
  });

  it("음수의 제곱근은 #NUM!", () => {
    expect(run("=SQRT(-1)")).toBe("#NUM!");
  });

  it("반올림은 0에서 먼 쪽이다 — JS의 Math.round와 다르다", () => {
    // JS: Math.round(-0.5) === -0. 엑셀: ROUND(-0.5,0) = -1.
    expect(run("=ROUND(-0.5,0)")).toBe(-1);
    expect(run("=ROUND(0.5,0)")).toBe(1);
    expect(run("=ROUND(2.345,2)")).toBe(2.35);
    expect(run("=ROUND(-2.345,2)")).toBe(-2.35);
  });

  it("ROUNDUP·ROUNDDOWN은 0에서 멀어지고 가까워진다", () => {
    expect(run("=ROUNDUP(1.001,2)")).toBe(1.01);
    expect(run("=ROUNDUP(-1.001,2)")).toBe(-1.01);
    expect(run("=ROUNDDOWN(1.999,2)")).toBe(1.99);
    expect(run("=ROUNDDOWN(-1.999,2)")).toBe(-1.99);
  });

  it("CEILING·FLOOR는 배수 단위로 올리고 내린다", () => {
    expect(run("=CEILING(7,5)")).toBe(10);
    expect(run("=FLOOR(7,5)")).toBe(5);
    expect(run("=CEILING(7)")).toBe(7);
  });
});

describe("통계 — 범위의 빈 셀·문자열은 건너뛴다", () => {
  const grid: CellValue[][] = [[1], [null], ["사과"], [3]];

  it("SUM은 숫자만 더한다", () => {
    expect(run("=SUM(A1:A4)", grid)).toBe(4);
  });

  it("AVERAGE의 분모에 빈 셀·문자열이 들어가지 않는다", () => {
    // 이걸 뭉뚱그리면 조용히 틀린 평균이 나온다(4/4=1 vs 4/2=2).
    expect(run("=AVERAGE(A1:A4)", grid)).toBe(2);
  });

  it("COUNT는 숫자만, COUNTA는 비어 있지 않은 것 전부", () => {
    expect(run("=COUNT(A1:A4)", grid)).toBe(2);
    expect(run("=COUNTA(A1:A4)", grid)).toBe(3);
    expect(run("=COUNTBLANK(A1:A4)", grid)).toBe(1);
  });

  it("빈 범위의 평균은 #DIV/0!", () => {
    expect(run("=AVERAGE(A1:A2)", [[null], [null]])).toBe("#DIV/0!");
  });

  it("MIN·MAX·MEDIAN", () => {
    const g: CellValue[][] = [[5], [1], [3]];
    expect(run("=MIN(A1:A3)", g)).toBe(1);
    expect(run("=MAX(A1:A3)", g)).toBe(5);
    expect(run("=MEDIAN(A1:A3)", g)).toBe(3);
    expect(run("=MEDIAN(A1:A2)", [[1], [3]])).toBe(2);
  });

  it("직접 쓴 문자열 인자는 숫자로 바뀐다(범위와 다르다)", () => {
    // =SUM(A1:A4)에서는 "사과"를 건너뛰지만 =SUM("2")는 2다 — 엑셀의 비대칭이다.
    expect(run('=SUM("2",3)')).toBe(5);
  });
});

describe("조건 집계", () => {
  const grid: CellValue[][] = [
    ["사과", 100],
    ["배", 200],
    ["사과", 50],
  ];

  it("COUNTIF — 값 일치", () => {
    expect(run('=COUNTIF(A1:A3,"사과")', grid)).toBe(2);
  });

  it("SUMIF — 조건 범위와 합계 범위가 다를 때", () => {
    expect(run('=SUMIF(A1:A3,"사과",B1:B3)', grid)).toBe(150);
  });

  it("비교 연산자 조건", () => {
    expect(run('=COUNTIF(B1:B3,">=100")', grid)).toBe(2);
    expect(run('=SUMIF(B1:B3,">100")', grid)).toBe(200);
    expect(run('=COUNTIF(B1:B3,"<>200")', grid)).toBe(2);
  });

  it("AVERAGEIF", () => {
    expect(run('=AVERAGEIF(A1:A3,"사과",B1:B3)', grid)).toBe(75);
  });
});

describe("논리 — lazy가 필요한 이유", () => {
  it("IF는 고른 쪽만 계산한다", () => {
    // 단락 평가가 없으면 =IF(FALSE,1/0,1)이 #DIV/0!이 된다.
    expect(run("=IF(FALSE,1/0,1)")).toBe(1);
    expect(run("=IF(TRUE,1,1/0)")).toBe(1);
  });

  it("IFERROR가 오류를 잡는다", () => {
    // 인자를 먼저 평가하면 오류가 함수에 닿기 전에 전파되어 아무것도 잡지 못한다.
    expect(run("=IFERROR(1/0,0)")).toBe(0);
    expect(run("=IFERROR(1,0)")).toBe(1);
  });

  it("ISERROR", () => {
    expect(run("=ISERROR(1/0)")).toBe(true);
    expect(run("=ISERROR(1)")).toBe(false);
  });

  it("IFS는 첫 참을 고르고, 없으면 #N/A", () => {
    expect(run("=IFS(FALSE,1,TRUE,2)")).toBe(2);
    expect(run("=IFS(FALSE,1,FALSE,2)")).toBe("#N/A");
  });

  it("AND·OR·NOT", () => {
    expect(run("=AND(TRUE,TRUE)")).toBe(true);
    expect(run("=AND(TRUE,FALSE)")).toBe(false);
    expect(run("=OR(FALSE,TRUE)")).toBe(true);
    expect(run("=NOT(TRUE)")).toBe(false);
  });

  it("AND는 범위의 빈 셀을 무시한다", () => {
    expect(run("=AND(A1:A2)", [[true], [null]])).toBe(true);
  });

  it("IS 계열", () => {
    expect(run("=ISBLANK(A1)", [[null]])).toBe(true);
    expect(run("=ISBLANK(A1)", [[0]])).toBe(false);
    expect(run("=ISNUMBER(A1)", [[1]])).toBe(true);
    expect(run("=ISTEXT(A1)", [["a"]])).toBe(true);
  });
});

describe("텍스트", () => {
  it.each([
    ['=LEN("가나다")', 3],
    ['=UPPER("abc")', "ABC"],
    ['=LOWER("ABC")', "abc"],
    ['=LEFT("가나다",2)', "가나"],
    ['=RIGHT("가나다",2)', "나다"],
    ['=MID("가나다라",2,2)', "나다"],
    ['=CONCAT("가",1,TRUE)', "가1TRUE"],
  ])("%s = %s", (src, want) => {
    expect(run(src)).toBe(want);
  });

  it("TRIM은 가운데 연속 공백도 하나로 줄인다", () => {
    // 양끝만 자르는 흔한 구현과 다르다 — 엑셀은 가운데도 줄인다.
    expect(run('=TRIM("  가   나  ")')).toBe("가 나");
  });

  it("MID는 1-based이고 0 이하는 오류", () => {
    expect(run('=MID("abc",1,1)')).toBe("a");
    expect(run('=MID("abc",0,1)')).toBe("#VALUE!");
  });

  it("FIND는 1-based이고 없으면 #VALUE!", () => {
    expect(run('=FIND("나","가나다")')).toBe(2);
    expect(run('=FIND("x","가나다")')).toBe("#VALUE!");
  });

  it("FIND는 대소문자를 가린다", () => {
    expect(run('=FIND("A","abc")')).toBe("#VALUE!");
  });

  it("SUBSTITUTE는 전부 바꾸고, n번째를 지정하면 그것만", () => {
    expect(run('=SUBSTITUTE("a-b-c","-","+")')).toBe("a+b+c");
    expect(run('=SUBSTITUTE("a-b-c","-","+",2)')).toBe("a-b+c");
    expect(run('=SUBSTITUTE("a-b","x","+")')).toBe("a-b");
  });
});

describe("TEXT 서식 — 지원하는 것만", () => {
  it.each([
    [1234.5, "#,##0", "1,235"],
    [1234.5, "0.00", "1234.50"],
    [1234.5, "#,##0.00", "1,234.50"],
    [-1234.5, "#,##0", "-1,235"],
    [0.256, "0%", "26%"],
    [0.256, "0.0%", "25.6%"],
  ])("%s를 %s로", (v, fmt, want) => {
    expect(formatValue(v, fmt)).toBe(want);
  });

  it("날짜 서식", () => {
    expect(formatValue("2026-08-02", "yyyy-mm-dd")).toBe("2026-08-02");
  });

  it("모르는 서식은 원문을 그대로 준다", () => {
    // 그럴듯하게 처리하면 사용자는 서식이 먹은 줄 안다.
    expect(formatValue(1234, "[$-409]dddd")).toBe("1234");
  });
});

describe("날짜 — 'YYYY-MM-DD' 문자열 (스펙 D-4)", () => {
  it("TODAY는 KST 기준 날짜", () => {
    expect(run("=TODAY()")).toBe("2026-08-02");
  });

  it("NOW는 KST 기준 날짜와 시각", () => {
    expect(run("=NOW()")).toBe("2026-08-02 10:23:45");
  });

  it("DATE는 넘치는 월·일을 이월한다", () => {
    expect(run("=DATE(2026,8,2)")).toBe("2026-08-02");
    expect(run("=DATE(2026,13,1)")).toBe("2027-01-01");
    expect(run("=DATE(2026,1,32)")).toBe("2026-02-01");
  });

  it("YEAR·MONTH·DAY", () => {
    const g: CellValue[][] = [["2026-08-02"]];
    expect(run("=YEAR(A1)", g)).toBe(2026);
    expect(run("=MONTH(A1)", g)).toBe(8);
    expect(run("=DAY(A1)", g)).toBe(2);
  });

  it("날짜가 아니면 #VALUE!", () => {
    expect(run("=YEAR(A1)", [["어제"]])).toBe("#VALUE!");
  });
});

describe("조회", () => {
  const table: CellValue[][] = [
    ["사과", 100],
    ["배", 200],
    ["감", 300],
  ];

  it("VLOOKUP 정확 일치", () => {
    expect(run('=VLOOKUP("배",A1:B3,2)', table)).toBe(200);
  });

  it("VLOOKUP은 못 찾으면 #N/A", () => {
    expect(run('=VLOOKUP("포도",A1:B3,2)', table)).toBe("#N/A");
  });

  it("VLOOKUP의 기본은 정확 일치다 — 엑셀과 다른 지점", () => {
    // 엑셀 기본은 TRUE(근사)인데 정렬을 전제해 틀리기 쉽다. 명시적으로 TRUE를 줘야 근사가 된다.
    const nums: CellValue[][] = [[10, "a"], [20, "b"], [30, "c"]];
    expect(run("=VLOOKUP(25,A1:B3,2)", nums)).toBe("#N/A");
    expect(run("=VLOOKUP(25,A1:B3,2,TRUE)", nums)).toBe("b");
  });

  it("VLOOKUP의 열 번호가 범위를 넘으면 #REF!", () => {
    expect(run('=VLOOKUP("배",A1:B3,3)', table)).toBe("#REF!");
  });

  it("MATCH는 1-based 위치", () => {
    expect(run('=MATCH("감",A1:A3)', table)).toBe(3);
    expect(run('=MATCH("x",A1:A3)', table)).toBe("#N/A");
  });

  it("INDEX는 1-based이고 밖이면 #REF!", () => {
    expect(run("=INDEX(A1:B3,2,2)", table)).toBe(200);
    expect(run("=INDEX(A1:B3,9,1)", table)).toBe("#REF!");
    expect(run("=INDEX(A1:B3,0,1)", table)).toBe("#VALUE!");
  });

  it("INDEX+MATCH 조합", () => {
    expect(run('=INDEX(B1:B3,MATCH("배",A1:A3))', table)).toBe(200);
  });

  it("XLOOKUP과 없을 때의 기본값", () => {
    expect(run('=XLOOKUP("감",A1:A3,B1:B3)', table)).toBe(300);
    expect(run('=XLOOKUP("포도",A1:A3,B1:B3,0)', table)).toBe(0);
    expect(run('=XLOOKUP("포도",A1:A3,B1:B3)', table)).toBe("#N/A");
  });

  it("조회는 대소문자를 가리지 않는다(엑셀)", () => {
    const g: CellValue[][] = [["ABC", 1]];
    expect(run('=VLOOKUP("abc",A1:B1,2)', g)).toBe(1);
  });
});

describe("목록", () => {
  it("이름은 전부 대문자다 — 토크나이저가 대문자로 정규화하므로 소문자가 있으면 영원히 안 잡힌다", () => {
    for (const name of formulaFunctionNames()) {
      expect(name).toBe(name.toUpperCase());
    }
  });

  it("스펙이 약속한 1차 함수가 전부 있다", () => {
    const names = new Set(formulaFunctionNames());
    const promised = [
      "SUM", "PRODUCT", "ABS", "INT", "MOD", "POWER", "SQRT", "ROUND", "ROUNDUP",
      "ROUNDDOWN", "CEILING", "FLOOR",
      "AVERAGE", "COUNT", "COUNTA", "COUNTBLANK", "MIN", "MAX", "MEDIAN",
      "SUMIF", "COUNTIF", "AVERAGEIF",
      "IF", "IFS", "AND", "OR", "NOT", "IFERROR", "ISBLANK", "ISNUMBER", "ISTEXT", "ISERROR",
      "CONCAT", "LEFT", "RIGHT", "MID", "LEN", "TRIM", "UPPER", "LOWER", "FIND",
      "SUBSTITUTE", "TEXT",
      "TODAY", "NOW", "DATE", "YEAR", "MONTH", "DAY",
      "VLOOKUP", "INDEX", "MATCH", "XLOOKUP",
    ];
    const missing = promised.filter((p) => !names.has(p));
    expect(missing).toEqual([]);
  });

  it("모르는 함수는 #NAME?", () => {
    expect(run("=SUMIFS(1,2,3)")).toBe("#NAME?"); // 2차 목록(T10)
  });

  it("휘발성 표시는 TODAY·NOW에만 있다", () => {
    const all = createFormulaFunctions();
    const volatiles = Object.entries(all)
      .filter(([, d]) => d.volatile)
      .map(([k]) => k)
      .sort();
    expect(volatiles).toEqual(["NOW", "TODAY"]);
  });
});
