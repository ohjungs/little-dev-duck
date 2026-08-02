import {
  type BinaryOp,
  type ErrorValue,
  isErrorValue,
  type Node,
} from "./formula-parse";
import type { CellRange, CellRef, CellValue } from "./sheet";

// 2026-08-02 : 스프레드시트 - 수식 - 평가기 (SPEC-2026-08-02-spreadsheet-a1 T3)
//
// AST를 값으로 바꾼다. **어느 셀을 다시 계산할지는 여기서 정하지 않는다** — 그건 recalc.ts다.
// 이 파일은 "이 AST와 이 컨텍스트가 주어졌을 때 값은 무엇인가"만 답한다(부작용 없음).
//
// 엑셀의 값 변환 규칙이 여기 다 들어간다. 이 규칙들은 직관과 어긋나는 데가 많아서
// 근거를 주석으로 남긴다 — 나중에 "이상하다"며 고치면 엑셀과 갈라진다.

/** 셀이 가질 수 있는 값. null은 빈 셀이다(0도 ""도 아니다 — 문맥에 따라 다르게 읽힌다). */
export type EvalValue = CellValue | ErrorValue;

/** 범위를 평가하면 2차원 배열이 된다. SUM 같은 함수가 이걸 받는다. */
export type EvalResult = EvalValue | EvalValue[][];

export interface FunctionDef {
  /** 인자를 받아 값을 낸다. 범위는 2차원 배열로 들어온다. */
  call: (args: EvalResult[], ctx: EvalContext) => EvalResult;
  /** 매 재계산마다 다시 세야 하는가(TODAY·NOW·RAND). recalc가 이 표시를 본다. */
  volatile?: boolean;
  /** 인자를 평가하지 않고 AST 그대로 받는가(IF의 단락 평가에 필요). */
  lazy?: boolean;
  /** lazy 함수의 본체. */
  callLazy?: (args: Node[], ctx: EvalContext) => EvalResult;
}

export type FunctionRegistry = Record<string, FunctionDef>;

export interface EvalContext {
  /** 셀 하나의 현재 값. 빈 셀은 null. */
  getCell: (ref: CellRef) => EvalValue;
  /** 범위를 2차원으로. 행 우선. */
  getRange: (range: CellRange) => EvalValue[][];
  /** 이름 정의. 모르면 undefined -> #NAME? */
  getName?: (name: string) => EvalResult | undefined;
  functions: FunctionRegistry;
  /** 이 평가에서 실제로 읽은 것을 기록한다(recalc가 의존성을 확인하는 데 쓴다). */
  onRead?: (ref: CellRef) => void;
}

// ── 값 변환 ────────────────────────────────────────────────────────────────

/**
 * 산술 문맥에서의 숫자. 엑셀 규칙:
 * - 빈 셀은 0
 * - TRUE는 1, FALSE는 0
 * - **숫자로 읽히는 문자열은 숫자다**("1"+1 = 2). 직관과 다르지만 엑셀이 그렇다.
 * - 그 외 문자열은 #VALUE!
 */
export function toNumber(v: EvalValue): number | ErrorValue {
  if (isErrorValue(v)) return v;
  if (v === null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const t = v.trim();
  if (t === "") return 0;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : "#VALUE!";
}

/** 텍스트 문맥(&)에서의 문자열. 빈 셀은 ""이고, 불리언은 대문자다(엑셀 표기). */
export function toText(v: EvalValue): string | ErrorValue {
  if (isErrorValue(v)) return v;
  if (v === null) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}

/** 논리 문맥에서의 불리언. 0은 false, 그 외 숫자는 true. 문자열은 #VALUE!. */
export function toBoolean(v: EvalValue): boolean | ErrorValue {
  if (isErrorValue(v)) return v;
  if (v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const t = v.trim().toUpperCase();
  if (t === "TRUE") return true;
  if (t === "FALSE") return false;
  return "#VALUE!";
}

/**
 * 비교의 순서. 엑셀은 타입이 다르면 **값이 아니라 타입으로** 정한다:
 * 숫자 < 문자열 < FALSE < TRUE. 즉 어떤 문자열도 어떤 숫자보다 크다("a" > 999).
 * 문자열끼리는 대소문자를 가리지 않는다.
 */
function typeRank(v: CellValue): number {
  if (v === null) return 0; // 빈 셀은 비교 전에 상대 타입으로 맞춰진다(아래)
  if (typeof v === "number") return 1;
  if (typeof v === "string") return 2;
  return v ? 4 : 3;
}

function compareValues(a: CellValue, b: CellValue): number {
  // 빈 셀은 상대의 타입으로 읽는다 — 빈 셀 = 0, 빈 셀 = "" 둘 다 참이다(엑셀).
  if (a === null && b === null) return 0;
  if (a === null) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;

  const ra = typeRank(a);
  const rb = typeRank(b);
  if (ra !== rb) return ra - rb;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") {
    const la = a.toUpperCase();
    const lb = b.toUpperCase();
    return la < lb ? -1 : la > lb ? 1 : 0;
  }
  return 0; // 같은 불리언
}

// ── 평가 ───────────────────────────────────────────────────────────────────

/** 범위/배열이 왔을 때 대표값 하나로 좁힌다. 산술은 스칼라만 받는다. */
function scalar(v: EvalResult): EvalValue {
  if (!Array.isArray(v)) return v;
  // 배열이 산술에 오면 엑셀은 암시적 교차를 시도한다 — 우리는 지원하지 않는다(스펙 7절).
  // 조용히 첫 칸을 쓰면 틀린 답이 맞는 것처럼 보이므로 오류로 만든다.
  return "#VALUE!";
}

export function evaluate(node: Node, ctx: EvalContext): EvalResult {
  switch (node.kind) {
    case "number":
      return node.value;
    case "string":
      return node.value;
    case "boolean":
      return node.value;
    case "error":
      return node.value;
    case "ref": {
      ctx.onRead?.(node.ref);
      return ctx.getCell(node.ref);
    }
    case "range":
      return ctx.getRange(node.range);
    case "name": {
      const v = ctx.getName?.(node.name);
      return v === undefined ? "#NAME?" : v;
    }
    case "unary": {
      const v = scalar(evaluate(node.operand, ctx));
      const n = toNumber(v);
      if (isErrorValue(n)) return n;
      return node.op === "-" ? -n : n;
    }
    case "percent": {
      const v = scalar(evaluate(node.operand, ctx));
      const n = toNumber(v);
      if (isErrorValue(n)) return n;
      return n / 100;
    }
    case "binary":
      return evalBinary(node.op, node.left, node.right, ctx);
    case "call":
      return evalCall(node.name, node.args, ctx);
  }
}

function evalBinary(
  op: BinaryOp,
  leftNode: Node,
  rightNode: Node,
  ctx: EvalContext,
): EvalResult {
  const l = scalar(evaluate(leftNode, ctx));
  if (isErrorValue(l)) return l; // 오류는 전파된다 — 왼쪽이 먼저다(엑셀과 같다)
  const r = scalar(evaluate(rightNode, ctx));
  if (isErrorValue(r)) return r;

  if (op === "&") {
    const a = toText(l);
    if (isErrorValue(a)) return a;
    const b = toText(r);
    if (isErrorValue(b)) return b;
    return a + b;
  }

  if (op === "=" || op === "<>" || op === "<" || op === ">" || op === "<=" || op === ">=") {
    const c = compareValues(l as CellValue, r as CellValue);
    switch (op) {
      case "=":
        return c === 0;
      case "<>":
        return c !== 0;
      case "<":
        return c < 0;
      case ">":
        return c > 0;
      case "<=":
        return c <= 0;
      default:
        return c >= 0;
    }
  }

  const a = toNumber(l);
  if (isErrorValue(a)) return a;
  const b = toNumber(r);
  if (isErrorValue(b)) return b;

  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      // 0으로 나누기는 Infinity가 아니라 오류다. Infinity를 흘리면 셀에 저장할 수 없고
      // (cellSchema가 finite만 받는다) JSON 직렬화에서 null로 바뀌어 값이 조용히 사라진다.
      return b === 0 ? "#DIV/0!" : a / b;
    case "^": {
      const p = Math.pow(a, b);
      // (-8)^(1/3)처럼 실수 범위에서 정의되지 않는 것은 #NUM!
      return Number.isFinite(p) ? p : "#NUM!";
    }
    default:
      return "#VALUE!";
  }
}

function evalCall(name: string, args: Node[], ctx: EvalContext): EvalResult {
  const fn = ctx.functions[name];
  if (!fn) return "#NAME?";
  if (fn.lazy && fn.callLazy) return fn.callLazy(args, ctx);
  const values: EvalResult[] = [];
  for (const a of args) {
    const v = evaluate(a, ctx);
    // 인자의 오류는 함수에 들어가기 전에 전파된다 — 단, IFERROR 같은 함수는 lazy라서
    // 이 경로를 타지 않는다(그래서 오류를 잡을 수 있다).
    if (!Array.isArray(v) && isErrorValue(v)) return v;
    values.push(v);
  }
  return fn.call(values, ctx);
}

/** 평가 결과를 셀에 보여줄 하나의 값으로. 배열이 그대로 셀에 들어가지 않게 한다. */
export function toCellValue(v: EvalResult): EvalValue {
  if (!Array.isArray(v)) return v;
  const first = v[0]?.[0];
  return first === undefined ? "#VALUE!" : first;
}
