import { describe, it, expect } from "vitest";
import {
  AGGREGATIONS,
  aggregationsForType,
  computeAggregation,
  formatAggregation,
  type AggregationKind,
} from "./database-aggregation";
import { TITLE_PROP_ID, viewDefSchema, type PropertyType } from "./database-view";

// 2026-07-26 : 데이터베이스 - 집계 - 순수계산 (Phase 33 T1)
// 표에서 사용자가 아쉬워한 건 "합계가 안 보인다"이다. 식을 파싱하지 않고 열마다 집계 종류만 고른다.

const rows = (...vals: (number | string | boolean | null | undefined)[]) =>
  vals.map((v) => ({
    title: "행",
    props: v === undefined ? {} : { p: v },
  }));

const run = (kind: AggregationKind, rs: ReturnType<typeof rows>) =>
  computeAggregation(rs, "p", kind);

describe("aggregationsForType — 타입에 맞지 않는 집계는 고를 수 없다", () => {
  it("숫자만 sum·avg·min·max를 준다", () => {
    const numeric = aggregationsForType("number");
    for (const k of ["sum", "avg", "min", "max"] as const) {
      expect(numeric).toContain(k);
    }
  });

  it("텍스트에는 sum을 주지 않는다", () => {
    // 고를 수 있게 두면 사용자는 "왜 0이지"를 겪는다. 애초에 못 고르게 한다.
    expect(aggregationsForType("text")).not.toContain("sum");
  });

  it("체크박스에만 checked를 준다", () => {
    expect(aggregationsForType("checkbox")).toContain("checked");
    for (const t of ["text", "number", "select", "date"] as PropertyType[]) {
      expect(aggregationsForType(t)).not.toContain("checked");
    }
  });

  it("모든 타입이 none·count·filled·empty는 고를 수 있다", () => {
    for (const t of ["text", "number", "select", "checkbox", "date"] as PropertyType[]) {
      for (const k of ["none", "count", "filled", "empty"] as const) {
        expect(aggregationsForType(t), t).toContain(k);
      }
    }
  });

  it("고를 수 있는 값은 전부 알려진 집계다", () => {
    for (const t of ["text", "number", "select", "checkbox", "date"] as PropertyType[]) {
      for (const k of aggregationsForType(t)) {
        expect(AGGREGATIONS).toContain(k);
      }
    }
  });
});

describe("computeAggregation — 정상 경로", () => {
  it("sum은 숫자를 더한다", () => {
    expect(run("sum", rows(1, 2, 3))).toBe(6);
  });

  it("avg는 평균을 낸다", () => {
    expect(run("avg", rows(1, 2, 6))).toBe(3);
  });

  it("min·max를 낸다", () => {
    expect(run("min", rows(5, -2, 9))).toBe(-2);
    expect(run("max", rows(5, -2, 9))).toBe(9);
  });

  it("count는 값과 무관하게 행 수다", () => {
    expect(run("count", rows(1, null, undefined))).toBe(3);
  });

  it("filled·empty는 서로를 채워 전체가 된다", () => {
    const rs = rows(1, null, undefined, "글", "");
    const filled = run("filled", rs) as number;
    const empty = run("empty", rs) as number;
    expect(filled + empty).toBe(rs.length);
  });

  it("빈 문자열은 비어 있는 것으로 센다", () => {
    // 공백만 있는 칸도 사용자 눈에는 빈 칸이다.
    expect(run("filled", rows("", "   "))).toBe(0);
  });

  it("checked는 true인 것만 센다", () => {
    expect(run("checked", rows(true, false, true, null))).toBe(2);
  });

  it("none은 아무것도 내지 않는다", () => {
    expect(run("none", rows(1, 2))).toBeNull();
  });
});

describe("computeAggregation — 경계·잘못된 입력", () => {
  it("빈 표에서 합은 0, 평균·최소·최대는 값 없음", () => {
    expect(run("sum", [])).toBe(0);
    expect(run("count", [])).toBe(0);
    expect(run("avg", [])).toBeNull();
    expect(run("min", [])).toBeNull();
    expect(run("max", [])).toBeNull();
  });

  it("숫자가 하나도 없으면 합은 0, 평균은 값 없음", () => {
    // 0을 평균으로 내면 "평균이 0"이라는 틀린 말이 된다. 모르는 건 모른다고 한다.
    expect(run("sum", rows("가", null))).toBe(0);
    expect(run("avg", rows("가", null))).toBeNull();
  });

  it("숫자와 글자가 섞여도 숫자만 계산한다", () => {
    expect(run("sum", rows(1, "둘", 3, true, null))).toBe(4);
  });

  it("숫자로 적힌 문자열도 숫자로 본다", () => {
    // 가져오기·붙여넣기로 "1200"이 문자열로 들어오는 경우가 실제로 있다.
    expect(run("sum", rows("1200", 300))).toBe(1500);
  });

  it("숫자가 아닌 문자열은 0으로 강등하지 않는다", () => {
    // "가"를 0으로 세면 평균이 조용히 틀어진다.
    expect(run("avg", rows(10, "가"))).toBe(10);
  });

  it("무한대·NaN은 숫자로 치지 않는다", () => {
    expect(run("sum", rows(1, Number.NaN, Number.POSITIVE_INFINITY))).toBe(1);
  });

  it("음수·소수를 다룬다", () => {
    expect(run("sum", rows(-1.5, 2.5))).toBe(1);
  });

  it("아주 큰 표에서도 계산한다", () => {
    const big = Array.from({ length: 5000 }, () => ({ title: "행", props: { p: 2 } }));
    expect(computeAggregation(big, "p", "sum")).toBe(10000);
  });

  it("제목 열도 셀 수 있다", () => {
    const rs = [
      { title: "가", props: {} },
      { title: "", props: {} },
    ];
    expect(computeAggregation(rs, TITLE_PROP_ID, "filled")).toBe(1);
  });

  it("없는 열을 물으면 전부 빈 것으로 본다", () => {
    expect(computeAggregation(rows(1, 2), "없는열", "filled")).toBe(0);
  });
});

describe("formatAggregation — 사람이 읽는 형태", () => {
  it("값이 없으면 빈 문자열이다", () => {
    expect(formatAggregation("avg", null)).toBe("");
    expect(formatAggregation("none", null)).toBe("");
  });

  it("무엇을 센 값인지 이름을 붙인다", () => {
    // 숫자만 덩그러니 있으면 그게 합인지 개수인지 알 수 없다.
    expect(formatAggregation("sum", 6)).toContain("합계");
    expect(formatAggregation("count", 3)).toContain("개수");
  });

  it("평균의 긴 소수를 자른다", () => {
    // 1/3 같은 값이 그대로 나오면 칸을 넘긴다.
    expect(formatAggregation("avg", 1 / 3)).toContain("0.33");
    expect(formatAggregation("avg", 1 / 3)).not.toContain("0.3333333");
  });

  it("정수는 소수점을 붙이지 않는다", () => {
    expect(formatAggregation("avg", 3)).toContain("3");
    expect(formatAggregation("avg", 3)).not.toContain("3.00");
  });

  it("큰 수에 자릿점을 넣는다", () => {
    expect(formatAggregation("sum", 1234567)).toContain("1,234,567");
  });
});

// --- 뷰 스키마 하위호환 (Phase 33 T1) ---
// 기존 페이지의 db_schema에는 aggregations 키가 없다. 필수로 두면 **오늘 만든 표를
// 내일 우리가 못 읽는다** — 백업 v1 하위호환에서 배운 것과 같은 규칙이다.
describe("viewDefSchema.aggregations 하위호환", () => {
  const base = { id: "v1", name: "표", type: "table" as const };

  it("옛 뷰(키 없음)도 그대로 열린다", () => {
    const r = viewDefSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.aggregations).toEqual({});
  });

  it("설정된 집계를 보존한다", () => {
    const r = viewDefSchema.safeParse({ ...base, aggregations: { p: "sum" } });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.aggregations.p).toBe("sum");
  });

  it("모르는 집계 이름이 와도 파일을 거부하지 않는다", () => {
    // 전방호환: 미래 버전이 만든 종류를 만나도 표 전체가 안 열리면 안 된다(UI가 none으로 폴백).
    expect(viewDefSchema.safeParse({ ...base, aggregations: { p: "median" } }).success).toBe(true);
  });

  it("집계 값이 문자열이 아니면 거부한다", () => {
    expect(viewDefSchema.safeParse({ ...base, aggregations: { p: 1 } }).success).toBe(false);
  });
});
