import { describe, expect, it, vi } from "vitest";
import type { FunctionRegistry } from "./formula-eval";
import {
  buildGraph,
  type CellData,
  nodeKey,
  recalc,
  recalcAll,
  type Workbook,
} from "./recalc";

// 2026-08-02 : 스프레드시트 - 수식 - 재계산 (SPEC T3)
// 여기가 "A1을 고치면 A3이 따라 바뀐다"가 실제로 생기는 곳이다.
// 검사가 특히 신경 쓰는 것 둘: ① 순환에 화면이 멈추지 않는다 ② 필요한 셀만 다시 센다.

/** 테스트용 최소 함수 목록. 진짜 48개는 T4가 만든다. */
function makeFns(): FunctionRegistry {
  return {
    SUM: {
      call: (args) => {
        let total = 0;
        for (const a of args) {
          if (Array.isArray(a)) {
            for (const row of a) {
              for (const v of row) if (typeof v === "number") total += v;
            }
          } else if (typeof a === "number") total += a;
        }
        return total;
      },
    },
    NOW: { call: () => 12345, volatile: true },
  };
}

function wbOf(sheets: Record<string, Record<string, CellData>>): Workbook {
  const wb: Workbook = new Map();
  for (const [name, cells] of Object.entries(sheets)) {
    wb.set(name, new Map(Object.entries(cells)));
  }
  return wb;
}

const num = (v: number): CellData => ({ v, f: null });
const formula = (f: string): CellData => ({ v: null, f });

describe("기본 재계산", () => {
  it("=A1+A2가 두 셀의 합이 된다", () => {
    const wb = wbOf({ Sheet1: { "0:0": num(10), "1:0": num(20), "2:0": formula("=A1+A2") } });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 2, 0))).toBe(30);
  });

  it("수식이 수식을 참조한다(체인)", () => {
    const wb = wbOf({
      Sheet1: {
        "0:0": num(2),
        "1:0": formula("=A1*3"),
        "2:0": formula("=A2+1"),
      },
    });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 1, 0))).toBe(6);
    expect(values.get(nodeKey("Sheet1", 2, 0))).toBe(7);
  });

  it("참조 순서가 거꾸로여도 위상순으로 센다", () => {
    // A1이 A3을 참조한다 — 아래에서 위로 흐르는 문서도 흔하다.
    const wb = wbOf({
      Sheet1: { "0:0": formula("=A3+1"), "2:0": num(5) },
    });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe(6);
  });

  it("범위 합계", () => {
    const wb = wbOf({
      Sheet1: { "0:0": num(1), "1:0": num(2), "2:0": num(3), "0:1": formula("=SUM(A1:A3)") },
    });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 1))).toBe(6);
  });

  it("빈 셀은 0으로 읽힌다(산술)", () => {
    const wb = wbOf({ Sheet1: { "0:0": formula("=Z9+1") } });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe(1);
  });

  it("시트 간 참조", () => {
    const wb = wbOf({
      Sheet1: { "0:0": formula("=Sheet2!A1*2") },
      Sheet2: { "0:0": num(21) },
    });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe(42);
  });

  it("없는 시트를 가리키면 #REF!", () => {
    const wb = wbOf({ Sheet1: { "0:0": formula("=없는시트!A1") } });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe("#REF!");
  });

  it("파싱 실패한 수식은 값만 오류가 되고 원문은 남는다", () => {
    const wb = wbOf({ Sheet1: { "0:0": formula("=SUM(") } });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe("#NAME?");
    // 원문 보존 — 고치려면 사용자가 쓴 것이 남아 있어야 한다.
    expect(wb.get("Sheet1")?.get("0:0")?.f).toBe("=SUM(");
  });
});

describe("오류 전파", () => {
  it("0으로 나누면 #DIV/0!이고 그걸 참조한 셀도 같은 오류", () => {
    const wb = wbOf({
      Sheet1: { "0:0": formula("=1/0"), "1:0": formula("=A1+1") },
    });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe("#DIV/0!");
    expect(values.get(nodeKey("Sheet1", 1, 0))).toBe("#DIV/0!");
  });

  it("모르는 함수는 #NAME?", () => {
    const wb = wbOf({ Sheet1: { "0:0": formula("=NOPE(1)") } });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe("#NAME?");
  });

  it("숫자가 아닌 문자열을 더하면 #VALUE!", () => {
    const wb = wbOf({
      Sheet1: { "0:0": { v: "사과", f: null }, "1:0": formula("=A1+1") },
    });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 1, 0))).toBe("#VALUE!");
  });

  it("숫자로 읽히는 문자열은 숫자다 — 엑셀과 같게", () => {
    const wb = wbOf({
      Sheet1: { "0:0": { v: "10", f: null }, "1:0": formula("=A1+1") },
    });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 1, 0))).toBe(11);
  });
});

describe("순환 참조", () => {
  it("자기 자신을 참조하면 #CIRCULAR!", () => {
    const wb = wbOf({ Sheet1: { "0:0": formula("=A1") } });
    const { values, circular } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe("#CIRCULAR!");
    expect(circular).toContain(nodeKey("Sheet1", 0, 0));
  });

  it("셋이 도는 순환도 잡는다", () => {
    const wb = wbOf({
      Sheet1: { "0:0": formula("=A2"), "1:0": formula("=A3"), "2:0": formula("=A1") },
    });
    const { circular } = recalcAll(wb, makeFns());
    expect(circular.length).toBeGreaterThan(0);
  });

  it("순환이 있어도 나머지 셀은 정상으로 계산된다", () => {
    // 문서 하나에 순환이 있다고 표 전체가 죽으면 고칠 수도 없다.
    const wb = wbOf({
      Sheet1: { "0:0": formula("=A1"), "1:0": num(7), "2:0": formula("=A2*2") },
    });
    const { values } = recalcAll(wb, makeFns());
    expect(values.get(nodeKey("Sheet1", 0, 0))).toBe("#CIRCULAR!");
    expect(values.get(nodeKey("Sheet1", 2, 0))).toBe(14);
  });

  it("순환에 화면이 멈추지 않는다 — 계산이 끝난다", () => {
    // 무한 루프가 나면 이 테스트는 타임아웃으로 죽는다(그게 검사다).
    const cells: Record<string, CellData> = {};
    for (let i = 0; i < 50; i += 1) {
      cells[`${i}:0`] = formula(`=A${((i + 1) % 50) + 1}`);
    }
    const wb = wbOf({ Sheet1: cells });
    const { circular } = recalcAll(wb, makeFns());
    expect(circular.length).toBeGreaterThan(0);
  });
});

describe("부분 재계산 — 의존하는 셀만 다시 센다 (AC-10)", () => {
  it("의존하지 않는 셀은 다시 세지 않는다", () => {
    const wb = wbOf({
      Sheet1: {
        "0:0": num(1),
        "1:0": formula("=A1+1"), // A1에 의존
        "0:5": num(100),
        "1:5": formula("=F1+1"), // A1과 무관
      },
    });
    const fns = makeFns();
    const graph = buildGraph(wb, fns);
    const first = recalc({ wb, graph, functions: fns });

    // A1을 고친다.
    wb.get("Sheet1")?.set("0:0", num(10));
    const second = recalc({
      wb,
      graph,
      functions: fns,
      previous: first.values,
      changed: [nodeKey("Sheet1", 0, 0)],
    });

    expect(second.recomputed).toEqual([nodeKey("Sheet1", 1, 0)]);
    expect(second.values.get(nodeKey("Sheet1", 1, 0))).toBe(11);
    // 무관한 셀의 값은 유지된다(다시 세지 않았지만 값은 남아 있다).
    expect(second.values.get(nodeKey("Sheet1", 1, 5))).toBe(101);
  });

  it("체인 끝까지 전파된다", () => {
    const wb = wbOf({
      Sheet1: { "0:0": num(1), "1:0": formula("=A1*2"), "2:0": formula("=A2*2") },
    });
    const fns = makeFns();
    const graph = buildGraph(wb, fns);
    const first = recalc({ wb, graph, functions: fns });
    wb.get("Sheet1")?.set("0:0", num(5));
    const second = recalc({
      wb,
      graph,
      functions: fns,
      previous: first.values,
      changed: [nodeKey("Sheet1", 0, 0)],
    });
    expect(second.values.get(nodeKey("Sheet1", 2, 0))).toBe(20);
    expect(second.recomputed).toHaveLength(2);
  });

  it("범위 안의 셀이 바뀌면 그 범위를 쓰는 수식이 다시 센다", () => {
    // 범위를 펼치지 않으므로 이 경로가 따로 필요하다 — 빠뜨리면 합계가 낡은 채로 남는다.
    const wb = wbOf({
      Sheet1: { "0:0": num(1), "1:0": num(2), "0:1": formula("=SUM(A1:A5)") },
    });
    const fns = makeFns();
    const graph = buildGraph(wb, fns);
    const first = recalc({ wb, graph, functions: fns });
    expect(first.values.get(nodeKey("Sheet1", 0, 1))).toBe(3);

    wb.get("Sheet1")?.set("2:0", num(10)); // 범위 안이지만 처음엔 비어 있던 셀
    const second = recalc({
      wb,
      graph,
      functions: fns,
      previous: first.values,
      changed: [nodeKey("Sheet1", 2, 0)],
    });
    expect(second.values.get(nodeKey("Sheet1", 0, 1))).toBe(13);
  });

  it("범위 밖의 셀이 바뀌면 다시 세지 않는다", () => {
    const wb = wbOf({
      Sheet1: { "0:0": num(1), "0:1": formula("=SUM(A1:A5)") },
    });
    const fns = makeFns();
    const graph = buildGraph(wb, fns);
    const first = recalc({ wb, graph, functions: fns });
    const second = recalc({
      wb,
      graph,
      functions: fns,
      previous: first.values,
      changed: [nodeKey("Sheet1", 99, 0)], // A100 — 범위 밖
    });
    expect(second.recomputed).toEqual([]);
  });

  it("휘발성 함수를 쓰는 셀은 무엇이 바뀌든 다시 센다", () => {
    const wb = wbOf({
      Sheet1: { "0:0": num(1), "0:1": formula("=NOW()"), "1:5": num(3) },
    });
    const fns = makeFns();
    const graph = buildGraph(wb, fns);
    const first = recalc({ wb, graph, functions: fns });
    const second = recalc({
      wb,
      graph,
      functions: fns,
      previous: first.values,
      changed: [nodeKey("Sheet1", 1, 5)], // 아무 관계 없는 셀
    });
    expect(second.recomputed).toContain(nodeKey("Sheet1", 0, 1));
  });

  it("함수는 필요한 만큼만 호출된다", () => {
    // "전체를 다시 세도 결과는 같다"로 통과하지 않게, 호출 횟수 자체를 본다.
    const spy = vi.fn(() => 1);
    const fns: FunctionRegistry = { ...makeFns(), PING: { call: spy } };
    const wb = wbOf({
      Sheet1: {
        "0:0": num(1),
        "1:0": formula("=A1+PING()"),
        "5:5": formula("=PING()"), // 무관
      },
    });
    const graph = buildGraph(wb, fns);
    const first = recalc({ wb, graph, functions: fns });
    expect(spy).toHaveBeenCalledTimes(2);

    spy.mockClear();
    wb.get("Sheet1")?.set("0:0", num(2));
    recalc({
      wb,
      graph,
      functions: fns,
      previous: first.values,
      changed: [nodeKey("Sheet1", 0, 0)],
    });
    expect(spy).toHaveBeenCalledTimes(1); // 무관한 F6은 호출되지 않았다
  });
});

describe("그래프", () => {
  it("수식 셀만 담는다", () => {
    const wb = wbOf({ Sheet1: { "0:0": num(1), "1:0": formula("=A1") } });
    const graph = buildGraph(wb, makeFns());
    expect([...graph.formulas.keys()]).toEqual([nodeKey("Sheet1", 1, 0)]);
  });

  it("역방향 간선을 만든다", () => {
    const wb = wbOf({ Sheet1: { "0:0": num(1), "1:0": formula("=A1"), "2:0": formula("=A1*2") } });
    const graph = buildGraph(wb, makeFns());
    expect(graph.dependents.get(nodeKey("Sheet1", 0, 0))?.size).toBe(2);
  });

  it("범위는 펼치지 않는다", () => {
    const wb = wbOf({ Sheet1: { "0:0": formula("=SUM(B1:B10000)") } });
    const graph = buildGraph(wb, makeFns());
    expect(graph.rangeDependents).toHaveLength(1);
    expect(graph.dependents.size).toBe(0);
  });
});
