import { describe, expect, it } from "vitest";
import { parseFormula } from "./formula-parse";
import { evaluate, type EvalContext, type EvalValue } from "./formula-eval";
import { createFormulaFunctions } from "./formula-fns";

// 2026-08-02 : 스프레드시트 - 수식 함수 2차 (SPEC-2026-08-02-spreadsheet-a1 T10)
// 1차(T4)와 같은 방식으로 정상·경계·오류를 함께 본다. 여기 함수들은 대부분 **범위**를 받으므로
// 실제 격자에 값을 놓고 참조로 부른다 — 배열 리터럴로만 검사하면 범위 경로가 빠진다.

const GRID: Record<string, EvalValue> = {
  // A1:A5 = 1..5, B1:B5 = 10,20,30,40,50, C1:C5 = 가,나,가,다,나
  "0:0": 1, "1:0": 2, "2:0": 3, "3:0": 4, "4:0": 5,
  "0:1": 10, "1:1": 20, "2:1": 30, "3:1": 40, "4:1": 50,
  "0:2": "가", "1:2": "나", "2:2": "가", "3:2": "다", "4:2": "나",
};

function ctx(): EvalContext {
  const functions = createFormulaFunctions({ now: () => new Date("2026-08-02T12:34:56Z") });
  return {
    getCell: (ref) => GRID[`${ref.r}:${ref.c}`] ?? null,
    getRange: (range) => {
      const out: EvalValue[][] = [];
      for (let r = range.start.r; r <= range.end.r; r += 1) {
        const row: EvalValue[] = [];
        for (let c = range.start.c; c <= range.end.c; c += 1) {
          row.push(GRID[`${r}:${c}`] ?? null);
        }
        out.push(row);
      }
      return out;
    },
    functions,
  };
}

function run(formula: string): unknown {
  const parsed = parseFormula(formula);
  if (!parsed.ok) throw new Error(`파싱 실패: ${formula} — ${parsed.message}`);
  return evaluate(parsed.ast, ctx());
}

describe("조건 집계", () => {
  it("SUMIFS는 조건을 모두 만족하는 것만 더한다", () => {
    expect(run('=SUMIFS(B1:B5,A1:A5,">2",C1:C5,"가")')).toBe(30);
  });
  it("COUNTIFS", () => {
    expect(run('=COUNTIFS(C1:C5,"나")')).toBe(2);
    expect(run('=COUNTIFS(A1:A5,">=3",C1:C5,"<>가")')).toBe(2);
  });
  it("AVERAGEIFS는 맞는 것이 없으면 #DIV/0!", () => {
    expect(run('=AVERAGEIFS(B1:B5,C1:C5,"나")')).toBe(35);
    expect(run('=AVERAGEIFS(B1:B5,C1:C5,"없음")')).toBe("#DIV/0!");
  });
  it("SUMPRODUCT는 짝지어 곱한 뒤 더한다", () => {
    expect(run("=SUMPRODUCT(A1:A5,B1:B5)")).toBe(550);
  });
  it("SUMPRODUCT는 크기가 다르면 #VALUE!", () => {
    expect(run("=SUMPRODUCT(A1:A5,B1:B3)")).toBe("#VALUE!");
  });
});

describe("통계", () => {
  it("STDEV는 표본 표준편차다(모집단이 아니다)", () => {
    expect(run("=STDEV(A1:A5)")).toBeCloseTo(1.5811388, 6);
  });
  it("VAR는 표본 분산", () => {
    expect(run("=VAR(A1:A5)")).toBe(2.5);
  });
  it("값이 둘 미만이면 #DIV/0!", () => {
    expect(run("=STDEV(A1:A1)")).toBe("#DIV/0!");
  });
  it("PERCENTILE — 선형 보간", () => {
    expect(run("=PERCENTILE(A1:A5,0.5)")).toBe(3);
    expect(run("=PERCENTILE(A1:A5,0.25)")).toBe(2);
  });
  it("PERCENTILE 범위를 벗어나면 #NUM!", () => {
    expect(run("=PERCENTILE(A1:A5,1.5)")).toBe("#NUM!");
  });
  it("RANK는 큰 값이 1등(내림차순 기본)", () => {
    expect(run("=RANK(4,A1:A5)")).toBe(2);
    expect(run("=RANK(4,A1:A5,1)")).toBe(4);
  });
  it("RANK에 없는 값이면 #N/A", () => {
    expect(run("=RANK(9,A1:A5)")).toBe("#N/A");
  });
  it("LARGE·SMALL", () => {
    expect(run("=LARGE(A1:A5,2)")).toBe(4);
    expect(run("=SMALL(A1:A5,2)")).toBe(2);
    expect(run("=LARGE(A1:A5,9)")).toBe("#NUM!");
  });
});

describe("배열 계산(브로드캐스트)", () => {
  it("범위와 스칼라를 비교하면 원소별 결과가 나온다", () => {
    expect(run("=A1:A3>1")).toEqual([[false], [true], [true]]);
  });
  it("범위끼리 더하면 짝지어 더한다", () => {
    expect(run("=A1:A3+B1:B3")).toEqual([[11], [22], [33]]);
  });
  it("크기가 다르면 #N/A(조용히 맞추지 않는다)", () => {
    expect(run("=A1:A3+B1:B2")).toBe("#N/A");
  });
});

describe("배열", () => {
  it("UNIQUE는 중복을 없앤다", () => {
    expect(run("=UNIQUE(C1:C5)")).toEqual([["가"], ["나"], ["다"]]);
  });
  it("SORT", () => {
    expect(run("=SORT(B1:B5,1,-1)")).toEqual([[50], [40], [30], [20], [10]]);
  });
  it("FILTER는 조건이 참인 행만", () => {
    expect(run("=FILTER(B1:B5,A1:A5>3)")).toEqual([[40], [50]]);
  });
  it("FILTER에 남는 것이 없으면 #N/A", () => {
    expect(run("=FILTER(B1:B5,A1:A5>9)")).toBe("#N/A");
  });
  it("SEQUENCE", () => {
    expect(run("=SEQUENCE(3)")).toEqual([[1], [2], [3]]);
    expect(run("=SEQUENCE(2,2,10,5)")).toEqual([
      [10, 15],
      [20, 25],
    ]);
  });
  it("TRANSPOSE는 행과 열을 뒤집는다", () => {
    expect(run("=TRANSPOSE(A1:B2)")).toEqual([
      [1, 2],
      [10, 20],
    ]);
  });
});

describe("텍스트·조회", () => {
  it("TEXTJOIN은 구분자로 잇고 빈 칸을 건너뛸 수 있다", () => {
    expect(run('=TEXTJOIN("-",TRUE,C1:C5)')).toBe("가-나-가-다-나");
    expect(run('=TEXTJOIN(",",TRUE,"a","","b")')).toBe("a,b");
    expect(run('=TEXTJOIN(",",FALSE,"a","","b")')).toBe("a,,b");
  });
  it("CHOOSE", () => {
    expect(run('=CHOOSE(2,"가","나","다")')).toBe("나");
    expect(run('=CHOOSE(9,"가")')).toBe("#VALUE!");
  });
  it("HLOOKUP은 가로로 찾는다", () => {
    // 첫 **행**에서 찾는다(A1:B5의 첫 행은 1, 10이다).
    expect(run("=HLOOKUP(10,A1:B5,2,FALSE)")).toBe(20);
    expect(run("=HLOOKUP(9,A1:B5,2,FALSE)")).toBe("#N/A");
  });
  it("INDIRECT는 주소 문자열로 셀을 읽는다", () => {
    expect(run('=INDIRECT("B2")')).toBe(20);
    expect(run('=SUM(INDIRECT("A1:A3"))')).toBe(6);
    expect(run('=INDIRECT("없는주소")')).toBe("#REF!");
  });
  it("OFFSET은 기준에서 옮긴 참조를 읽는다", () => {
    expect(run("=OFFSET(A1,1,1)")).toBe(20);
    expect(run("=SUM(OFFSET(A1,0,0,3,1))")).toBe(6);
    expect(run("=OFFSET(A1,-1,0)")).toBe("#REF!");
  });
});

describe("날짜·시간", () => {
  it("DATEDIF는 단위별 차이", () => {
    expect(run('=DATEDIF("2026-01-01","2026-08-02","D")')).toBe(213);
    expect(run('=DATEDIF("2026-01-01","2026-08-02","M")')).toBe(7);
    expect(run('=DATEDIF("2024-08-03","2026-08-02","Y")')).toBe(1);
  });
  it("DATEDIF는 시작이 끝보다 늦으면 #NUM!", () => {
    expect(run('=DATEDIF("2026-08-02","2026-01-01","D")')).toBe("#NUM!");
  });
  it("EOMONTH는 달의 마지막 날", () => {
    expect(run('=EOMONTH("2026-01-15",0)')).toBe("2026-01-31");
    expect(run('=EOMONTH("2026-01-15",1)')).toBe("2026-02-28");
    expect(run('=EOMONTH("2026-03-31",-1)')).toBe("2026-02-28");
  });
  it("WEEKDAY는 일요일이 1(엑셀 기본)", () => {
    expect(run('=WEEKDAY("2026-08-02")')).toBe(1);
    expect(run('=WEEKDAY("2026-08-03")')).toBe(2);
  });
  it("NETWORKDAYS는 주말을 뺀다", () => {
    // 2026-08-03(월) ~ 2026-08-09(일) = 평일 5일
    expect(run('=NETWORKDAYS("2026-08-03","2026-08-09")')).toBe(5);
  });
  it("WORKDAY는 평일만 세어 옮긴다", () => {
    expect(run('=WORKDAY("2026-08-03",5)')).toBe("2026-08-10");
  });
  it("HOUR·MINUTE·SECOND", () => {
    expect(run('=HOUR("13:45:30")')).toBe(13);
    expect(run('=MINUTE("13:45:30")')).toBe(45);
    expect(run('=SECOND("13:45:30")')).toBe(30);
    expect(run('=HOUR("아니오")')).toBe("#VALUE!");
  });
});

describe("재무", () => {
  it("PMT — 월 상환액(부호는 지출이라 음수)", () => {
    // 연 6%, 10년, 1000만원
    expect(run("=PMT(0.06/12,120,10000000)")).toBeCloseTo(-111020.5, 0);
  });
  it("FV·PV", () => {
    expect(run("=FV(0.05,10,0,-1000)")).toBeCloseTo(1628.89, 2);
    expect(run("=PV(0.05,10,0,-1628.894627)")).toBeCloseTo(1000, 2);
  });
  it("이율이 0이어도 나뉘지 않는다", () => {
    expect(run("=PMT(0,10,1000)")).toBe(-100);
  });
  it("NPV", () => {
    // 엑셀의 NPV는 첫 값도 한 기간 할인한다: -100/1.1 + 60/1.21 + 60/1.331.
    expect(run("=NPV(0.1,-100,60,60)")).toBeCloseTo(3.76, 2);
  });
  it("IRR", () => {
    expect(run("=IRR(A1:A2)")).toBe("#NUM!"); // 부호가 안 바뀌면 해가 없다
  });
});

describe("수학 나머지", () => {
  it("CEILING.MATH·TRUNC·SIGN", () => {
    expect(run("=CEILING.MATH(4.2)")).toBe(5);
    expect(run("=CEILING.MATH(4.2,0.5)")).toBe(4.5);
    expect(run("=TRUNC(4.7)")).toBe(4);
    expect(run("=TRUNC(-4.7)")).toBe(-4);
    expect(run("=SIGN(-3)")).toBe(-1);
  });
  it("EXP·LN·LOG", () => {
    expect(run("=EXP(1)")).toBeCloseTo(Math.E, 10);
    expect(run("=LN(1)")).toBe(0);
    expect(run("=LOG(100)")).toBe(2);
    expect(run("=LOG(8,2)")).toBe(3);
    expect(run("=LN(0)")).toBe("#NUM!");
  });
  it("RANDBETWEEN은 범위 안이고 휘발성이다", () => {
    const v = run("=RANDBETWEEN(1,3)") as number;
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(3);
    expect(Number.isInteger(v)).toBe(true);
    expect(createFormulaFunctions().RANDBETWEEN.volatile).toBe(true);
  });
});

describe("2차 목록이 모두 있다", () => {
  it("스펙 T10의 40개가 등록돼 있다", () => {
    const fns = createFormulaFunctions();
    const expected = [
      "SUMIFS", "COUNTIFS", "AVERAGEIFS", "SUMPRODUCT", "STDEV", "VAR", "PERCENTILE",
      "RANK", "LARGE", "SMALL", "UNIQUE", "SORT", "FILTER", "SEQUENCE", "TRANSPOSE",
      "TEXTJOIN", "DATEDIF", "EOMONTH", "WEEKDAY", "NETWORKDAYS", "WORKDAY", "HOUR",
      "MINUTE", "SECOND", "PMT", "FV", "PV", "NPV", "IRR", "CHOOSE", "OFFSET",
      "INDIRECT", "HLOOKUP", "RANDBETWEEN", "CEILING.MATH", "TRUNC", "SIGN", "EXP",
      "LN", "LOG",
    ];
    expect(expected).toHaveLength(40);
    const missing = expected.filter((name) => !(name in fns));
    expect(missing).toEqual([]);
  });
});
