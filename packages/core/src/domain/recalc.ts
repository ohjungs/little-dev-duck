import {
  collectRefs,
  type ErrorValue,
  type Node,
  parseFormula,
} from "./formula-parse";
import {
  type EvalContext,
  type EvalResult,
  type EvalValue,
  evaluate,
  type FunctionRegistry,
  toCellValue,
} from "./formula-eval";
import {
  type CellRange,
  type CellRef,
  type CellValue,
  normalizeRange,
} from "./sheet";

// 2026-08-02 : 스프레드시트 - 수식 - 의존성 그래프·재계산 (SPEC-2026-08-02-spreadsheet-a1 T3)
//
// "A1을 고치면 A3이 따라 바뀐다"가 실제로 생기는 곳이다. 세 가지를 한다:
//   1. 수식에서 의존성을 뽑아 그래프를 만든다
//   2. 위상순으로 계산한다(참조된 셀이 먼저 계산되게)
//   3. 순환을 찾아 그 셀들만 #CIRCULAR!로 만든다 — 무한 루프로 화면이 멈추면 안 된다
//
// **전체를 다시 세지 않는다.** 셀 하나를 고치면 그 셀에 의존하는 셀만 다시 센다(AC-10).
// 전체 재계산으로도 결과는 같지만, 1만 셀 문서에서 타이핑마다 1만 번 계산하면 화면이 멈춘다.

/** 워크북 안에서 셀 하나를 가리키는 키. `시트!행:열`. */
export type NodeKey = string;

export function nodeKey(sheet: string, r: number, c: number): NodeKey {
  return `${sheet}!${r}:${c}`;
}

export interface CellData {
  v: CellValue;
  f: string | null;
}

/** 시트 이름 -> (셀키 `행:열` -> 셀). 저장 계층(sheet_cells)을 그대로 옮긴 모양이다. */
export type SheetCells = Map<string, CellData>;
export type Workbook = Map<string, SheetCells>;

interface Parsed {
  ast: Node | null;
  /** 파싱 실패 시 표시할 값. */
  parseError: ErrorValue | null;
  deps: NodeKey[];
  ranges: { sheet: string; range: CellRange }[];
}

export interface Graph {
  /** 수식 셀만 담는다. 값 셀은 계산할 것이 없다. */
  formulas: Map<NodeKey, Parsed>;
  /** 이 셀이 바뀌면 다시 세야 하는 셀들(역방향). */
  dependents: Map<NodeKey, Set<NodeKey>>;
  /** 범위에 의존하는 셀들. 범위를 펼치지 않으므로 따로 둔다. */
  rangeDependents: { node: NodeKey; sheet: string; range: CellRange }[];
  /** 휘발성 함수를 쓰는 셀 — 매 재계산마다 포함된다. */
  volatile: Set<NodeKey>;
}

function parseCellKey(key: string): { r: number; c: number } {
  const [r, c] = key.split(":");
  return { r: Number(r), c: Number(c) };
}

function refToNodeKey(ref: CellRef, defaultSheet: string): NodeKey {
  return nodeKey(ref.sheet ?? defaultSheet, ref.r, ref.c);
}

/** 워크북 전체에서 그래프를 만든다. 수식은 여기서 한 번만 파싱한다. */
export function buildGraph(
  wb: Workbook,
  functions: FunctionRegistry = {},
): Graph {
  const graph: Graph = {
    formulas: new Map(),
    dependents: new Map(),
    rangeDependents: [],
    volatile: new Set(),
  };

  for (const [sheetName, cells] of wb) {
    for (const [cellK, cell] of cells) {
      if (!cell.f) continue;
      const { r, c } = parseCellKey(cellK);
      const key = nodeKey(sheetName, r, c);
      const parsed = parseFormula(cell.f);
      if (!parsed.ok) {
        // 파싱 실패는 계산 전에 정해진다. 엑셀은 입력 자체를 거부하지만 우리는 원문을
        // 보존하고 값만 오류로 둔다 — 고치려면 원문이 남아 있어야 한다.
        graph.formulas.set(key, {
          ast: null,
          parseError: "#NAME?",
          deps: [],
          ranges: [],
        });
        continue;
      }
      const refs = collectRefs(parsed.ast);
      const deps = refs.refs.map((ref) => refToNodeKey(ref, sheetName));
      const ranges = refs.ranges.map((range) => ({
        sheet: range.start.sheet ?? sheetName,
        range: normalizeRange(range),
      }));
      graph.formulas.set(key, {
        ast: parsed.ast,
        parseError: null,
        deps,
        ranges,
      });
      for (const dep of deps) {
        let set = graph.dependents.get(dep);
        if (!set) {
          set = new Set();
          graph.dependents.set(dep, set);
        }
        set.add(key);
      }
      for (const rd of ranges) {
        graph.rangeDependents.push({ node: key, sheet: rd.sheet, range: rd.range });
      }
      if (usesVolatile(parsed.ast, functions)) graph.volatile.add(key);
    }
  }

  return graph;
}

function usesVolatile(node: Node, functions: FunctionRegistry): boolean {
  if (node.kind === "call") {
    if (functions[node.name]?.volatile) return true;
    return node.args.some((a) => usesVolatile(a, functions));
  }
  if (node.kind === "binary") {
    return usesVolatile(node.left, functions) || usesVolatile(node.right, functions);
  }
  if (node.kind === "unary" || node.kind === "percent") {
    return usesVolatile(node.operand, functions);
  }
  return false;
}

function rangeContains(
  sheet: string,
  range: CellRange,
  key: NodeKey,
): boolean {
  const bang = key.indexOf("!");
  const keySheet = key.slice(0, bang);
  if (keySheet !== sheet) return false;
  const { r, c } = parseCellKey(key.slice(bang + 1));
  return (
    r >= range.start.r && r <= range.end.r && c >= range.start.c && c <= range.end.c
  );
}

/** 이 셀이 바뀌면 다시 세야 하는 셀들(직접 + 범위 경유). */
export function directDependents(graph: Graph, key: NodeKey): NodeKey[] {
  const out = new Set<NodeKey>(graph.dependents.get(key) ?? []);
  for (const rd of graph.rangeDependents) {
    if (rangeContains(rd.sheet, rd.range, key)) out.add(rd.node);
  }
  return [...out];
}

export interface RecalcResult {
  /** 계산된 값. 수식 셀만 담는다. */
  values: Map<NodeKey, EvalValue>;
  /** 실제로 다시 센 셀. AC-10을 검사가 확인하는 통로다. */
  recomputed: NodeKey[];
  /** 순환에 걸린 셀. */
  circular: NodeKey[];
}

interface RecalcOptions {
  wb: Workbook;
  graph: Graph;
  functions: FunctionRegistry;
  /** 이미 알고 있는 값(부분 재계산에서 건드리지 않은 셀의 값). */
  previous?: Map<NodeKey, EvalValue>;
  /** 값이 바뀐 셀들. 주지 않으면 전체를 다시 센다. */
  changed?: NodeKey[];
  getName?: (name: string) => EvalResult | undefined;
}

/**
 * 재계산. changed를 주면 그 셀에 의존하는 것만, 주지 않으면 전부 센다.
 *
 * 순환은 예외로 던지지 않는다 — 순환에 걸린 셀만 #CIRCULAR!가 되고 **나머지는 정상으로
 * 계산된다.** 문서 하나에 순환이 있다고 표 전체가 죽으면 고칠 수도 없다.
 */
export function recalc(opts: RecalcOptions): RecalcResult {
  const { wb, graph, functions, previous, changed, getName } = opts;
  const values = new Map<NodeKey, EvalValue>(previous ?? []);

  // 1. 다시 셀 대상을 고른다.
  const targets = new Set<NodeKey>();
  if (changed === undefined) {
    for (const key of graph.formulas.keys()) targets.add(key);
  } else {
    const queue = [...changed];
    const seen = new Set<NodeKey>(changed);
    while (queue.length > 0) {
      const key = queue.pop() as NodeKey;
      for (const dep of directDependents(graph, key)) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        targets.add(dep);
        queue.push(dep);
      }
    }
    // 휘발성 셀은 무엇이 바뀌었든 다시 센다.
    for (const key of graph.volatile) targets.add(key);
  }

  // 2. 대상 안에서 위상 정렬하며 계산한다. DFS 색칠로 순환을 찾는다.
  //    회색(계산 중)을 다시 만나면 그게 순환이다.
  const state = new Map<NodeKey, "gray" | "black">();
  const circular = new Set<NodeKey>();
  const recomputed: NodeKey[] = [];

  const readCell = (ref: CellRef, defaultSheet: string): EvalValue => {
    const key = refToNodeKey(ref, defaultSheet);
    if (graph.formulas.has(key)) {
      const v = compute(key);
      return v;
    }
    return rawValue(wb, key);
  };

  function makeCtx(sheetName: string): EvalContext {
    return {
      getCell: (ref) => readCell(ref, sheetName),
      getRange: (range) => {
        const n = normalizeRange(range);
        const sheet = n.start.sheet ?? sheetName;
        const out: EvalValue[][] = [];
        for (let r = n.start.r; r <= n.end.r; r += 1) {
          const row: EvalValue[] = [];
          for (let c = n.start.c; c <= n.end.c; c += 1) {
            row.push(readCell({ r, c, absR: false, absC: false, sheet }, sheetName));
          }
          out.push(row);
        }
        return out;
      },
      getName,
      functions,
    };
  }

  function compute(key: NodeKey): EvalValue {
    const parsed = graph.formulas.get(key);
    if (!parsed) return rawValue(wb, key);

    const st = state.get(key);
    if (st === "black") {
      const v = values.get(key);
      return v === undefined ? null : v;
    }
    if (st === "gray") {
      // 순환. 자기 자신을 계산하는 중에 다시 요구받았다.
      circular.add(key);
      return "#CIRCULAR!";
    }
    // 이번 재계산 대상이 아니고 이미 값이 있으면 그대로 쓴다(부분 재계산의 핵심).
    if (!targets.has(key) && values.has(key)) {
      return values.get(key) as EvalValue;
    }

    state.set(key, "gray");
    let result: EvalValue;
    if (parsed.parseError) {
      result = parsed.parseError;
    } else {
      const sheetName = key.slice(0, key.indexOf("!"));
      result = toCellValue(evaluate(parsed.ast as Node, makeCtx(sheetName)));
    }
    state.set(key, "black");
    // 순환에 걸린 셀은 계산 도중 자기 값을 #CIRCULAR!로 받았으므로 결과도 그것이 된다.
    if (circular.has(key)) result = "#CIRCULAR!";
    values.set(key, result);
    recomputed.push(key);
    return result;
  }

  for (const key of targets) compute(key);

  return { values, recomputed, circular: [...circular] };
}

function rawValue(wb: Workbook, key: NodeKey): EvalValue {
  const bang = key.indexOf("!");
  const sheet = wb.get(key.slice(0, bang));
  if (!sheet) return "#REF!"; // 없는 시트를 가리키는 참조
  const cell = sheet.get(key.slice(bang + 1));
  return cell === undefined ? null : cell.v;
}

/** 편의: 워크북 전체를 한 번에 계산한다. 문서를 열 때 쓴다. */
export function recalcAll(
  wb: Workbook,
  functions: FunctionRegistry = {},
  getName?: (name: string) => EvalResult | undefined,
): RecalcResult {
  const graph = buildGraph(wb, functions);
  return recalc({ wb, graph, functions, getName });
}
