import { kstDateString } from "./date-util";
import {
  type EvalResult,
  type EvalValue,
  evaluate,
  type FunctionRegistry,
  toBoolean,
  toNumber,
  toText,
} from "./formula-eval";
import { isErrorValue } from "./formula-parse";

// 2026-08-02 : 스프레드시트 - 수식 - 함수 1차 (SPEC-2026-08-02-spreadsheet-a1 T4)
//
// 엑셀 함수 이름·인자 순서·경계 동작을 그대로 따른다. 사용자가 엑셀에서 쓰던 수식을 붙여넣었을 때
// **다른 답이 나오는 것이 가장 나쁘다** — 틀린 것을 맞다고 믿게 만든다.
//
// 날짜는 'YYYY-MM-DD' 문자열이다(스펙 D-4). 엑셀은 1900 기준 일련번호를 쓰고 1900년 윤년 버그까지
// 호환성으로 안고 가는데, 이 저장소는 이미 그 형식과 KST 처리를 갖고 있다(date-util.ts).
// 일련번호 변환은 .xlsx 입출력(T9)에서만 한다.
//
// 시계는 인자로 받는다. TODAY()가 Date.now()를 직접 부르면 검사가 시간에 따라 흔들린다.

/** 범위/스칼라를 평평한 값 목록으로. 집계 함수의 공통 입구다. */
function flatten(args: EvalResult[]): EvalValue[] {
  const out: EvalValue[] = [];
  for (const a of args) {
    if (Array.isArray(a)) {
      for (const row of a) for (const v of row) out.push(v);
    } else out.push(a);
  }
  return out;
}

/**
 * 집계에 쓸 숫자만 고른다. 엑셀 규칙이 여기서 갈린다:
 * **범위 안의 문자열·불리언·빈 셀은 건너뛴다.** 직접 쓴 인자(=SUM(1,"2"))는 변환한다.
 * 이걸 뭉뚱그리면 AVERAGE의 분모가 달라져 조용히 틀린 평균이 나온다.
 */
function numbersFromRanges(args: EvalResult[]): number[] | string {
  const out: number[] = [];
  for (const a of args) {
    if (Array.isArray(a)) {
      for (const row of a) {
        for (const v of row) {
          if (isErrorValue(v)) return v;
          if (typeof v === "number") out.push(v);
          // 문자열·불리언·빈 셀은 건너뛴다(엑셀).
        }
      }
    } else {
      if (isErrorValue(a)) return a;
      const n = toNumber(a);
      if (isErrorValue(n)) return n;
      out.push(n);
    }
  }
  return out;
}

function num1(args: EvalResult[], i = 0): number | string {
  const v = args[i];
  if (Array.isArray(v)) return "#VALUE!";
  return toNumber(v === undefined ? null : v);
}

function text1(args: EvalResult[], i = 0): string {
  const v = args[i];
  if (Array.isArray(v)) return "";
  const t = toText(v === undefined ? null : v);
  return isErrorValue(t) ? "" : t;
}

/** 엑셀의 반올림은 "0에서 먼 쪽"이다 — JS의 Math.round(-0.5)=-0과 다르다. */
function roundHalfAway(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  const x = n * f;
  const r = x < 0 ? -Math.round(-x) : Math.round(x);
  return r / f;
}

// ── 조건 판정(SUMIF·COUNTIF) ────────────────────────────────────────────────
// 엑셀의 조건은 값 하나이거나 ">10" 같은 문자열이다. 후자를 파싱해야 한다.
const CRITERIA_RE = /^(<=|>=|<>|<|>|=)?(.*)$/s;

function matchesCriteria(value: EvalValue, criteria: EvalValue): boolean {
  const raw = criteria === null ? "" : String(criteria);
  const m = CRITERIA_RE.exec(raw);
  const op = (m?.[1] ?? "") || "=";
  const operandText = m?.[2] ?? "";
  const asNumber = Number(operandText);
  const numeric = operandText.trim() !== "" && Number.isFinite(asNumber);

  if (numeric && typeof value === "number") {
    switch (op) {
      case "=":
        return value === asNumber;
      case "<>":
        return value !== asNumber;
      case "<":
        return value < asNumber;
      case ">":
        return value > asNumber;
      case "<=":
        return value <= asNumber;
      default:
        return value >= asNumber;
    }
  }

  const left = (value === null ? "" : String(value)).toUpperCase();
  const right = operandText.toUpperCase();
  switch (op) {
    case "=":
      return left === right;
    case "<>":
      return left !== right;
    case "<":
      return left < right;
    case ">":
      return left > right;
    case "<=":
      return left <= right;
    default:
      return left >= right;
  }
}

function asGrid(v: EvalResult | undefined): EvalValue[][] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [[v]];
}

// ── 날짜 ───────────────────────────────────────────────────────────────────
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function dateParts(v: EvalValue): { y: number; m: number; d: number } | null {
  if (typeof v !== "string") return null;
  const m = DATE_RE.exec(v.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export interface FormulaFnOptions {
  /** 시계. 주지 않으면 실제 시각을 쓴다. 검사는 반드시 고정 시각을 준다. */
  now?: () => Date;
}

/**
 * 1차 함수 목록. 이름은 전부 대문자다(토크나이저가 정규화한다).
 *
 * 여기 없는 함수는 `#NAME?`이 된다 — 엑셀과 같은 결과이고, 사용자가 무엇이 없는지 알 수 있다.
 * 2차 목록(SUMIFS·XLOOKUP 확장·재무 함수 등)은 T10이다.
 */
export function createFormulaFunctions(
  opts: FormulaFnOptions = {},
): FunctionRegistry {
  const now = opts.now ?? (() => new Date());

  const fns: FunctionRegistry = {};
  const def = (name: string, d: FunctionRegistry[string]): void => {
    fns[name] = d;
  };

  // ── 수학 ────────────────────────────────────────────────────────────────
  def("SUM", {
    call: (args) => {
      const ns = numbersFromRanges(args);
      if (typeof ns === "string") return ns;
      return ns.reduce((a, b) => a + b, 0);
    },
  });
  def("PRODUCT", {
    call: (args) => {
      const ns = numbersFromRanges(args);
      if (typeof ns === "string") return ns;
      return ns.length === 0 ? 0 : ns.reduce((a, b) => a * b, 1);
    },
  });
  def("ABS", { call: (a) => wrap1(a, Math.abs) });
  def("INT", { call: (a) => wrap1(a, Math.floor) });
  def("SQRT", {
    call: (a) => {
      const n = num1(a);
      if (typeof n === "string") return n;
      return n < 0 ? "#NUM!" : Math.sqrt(n);
    },
  });
  def("MOD", {
    call: (a) => {
      const x = num1(a, 0);
      const y = num1(a, 1);
      if (typeof x === "string") return x;
      if (typeof y === "string") return y;
      if (y === 0) return "#DIV/0!";
      // 엑셀의 MOD는 나누는 수의 부호를 따른다: MOD(-1,3) = 2. JS의 %는 -1이다.
      return x - y * Math.floor(x / y);
    },
  });
  def("POWER", {
    call: (a) => {
      const x = num1(a, 0);
      const y = num1(a, 1);
      if (typeof x === "string") return x;
      if (typeof y === "string") return y;
      const p = Math.pow(x, y);
      return Number.isFinite(p) ? p : "#NUM!";
    },
  });
  def("ROUND", { call: (a) => roundLike(a, roundHalfAway) });
  def("ROUNDUP", {
    call: (a) =>
      roundLike(a, (n, d) => {
        const f = Math.pow(10, d);
        return (n < 0 ? -Math.ceil(-n * f) : Math.ceil(n * f)) / f;
      }),
  });
  def("ROUNDDOWN", {
    call: (a) =>
      roundLike(a, (n, d) => {
        const f = Math.pow(10, d);
        return (n < 0 ? -Math.floor(-n * f) : Math.floor(n * f)) / f;
      }),
  });
  def("CEILING", { call: (a) => stepRound(a, Math.ceil) });
  def("FLOOR", { call: (a) => stepRound(a, Math.floor) });

  // ── 통계 ────────────────────────────────────────────────────────────────
  def("AVERAGE", {
    call: (args) => {
      const ns = numbersFromRanges(args);
      if (typeof ns === "string") return ns;
      // 빈 셀·문자열은 분모에 들어가지 않는다(AC-6). 하나도 없으면 #DIV/0!.
      return ns.length === 0 ? "#DIV/0!" : ns.reduce((a, b) => a + b, 0) / ns.length;
    },
  });
  def("COUNT", {
    call: (args) => {
      const ns = numbersFromRanges(args);
      return typeof ns === "string" ? ns : ns.length;
    },
  });
  def("COUNTA", {
    call: (args) => flatten(args).filter((v) => v !== null && v !== "").length,
  });
  def("COUNTBLANK", {
    call: (args) => flatten(args).filter((v) => v === null || v === "").length,
  });
  def("MIN", {
    call: (args) => {
      const ns = numbersFromRanges(args);
      if (typeof ns === "string") return ns;
      return ns.length === 0 ? 0 : Math.min(...ns); // 엑셀은 빈 범위에 0을 준다
    },
  });
  def("MAX", {
    call: (args) => {
      const ns = numbersFromRanges(args);
      if (typeof ns === "string") return ns;
      return ns.length === 0 ? 0 : Math.max(...ns);
    },
  });
  def("MEDIAN", {
    call: (args) => {
      const ns = numbersFromRanges(args);
      if (typeof ns === "string") return ns;
      if (ns.length === 0) return "#NUM!";
      const s = [...ns].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
    },
  });
  def("SUMIF", { call: (a) => condAggregate(a, "sum") });
  def("COUNTIF", { call: (a) => condAggregate(a, "count") });
  def("AVERAGEIF", { call: (a) => condAggregate(a, "avg") });

  // ── 논리 ────────────────────────────────────────────────────────────────
  // IF·IFS·IFERROR는 lazy다. 안 그러면 인자를 먼저 평가하면서 **오류가 함수에 닿기 전에
  // 전파되어** IFERROR가 아무것도 잡지 못한다. 단락 평가도 여기서만 가능하다.
  def("IF", {
    lazy: true,
    call: () => "#VALUE!",
    callLazy: (args, ctx) => {
      if (args.length < 2) return "#VALUE!";
      const cond = one(evaluate(args[0], ctx));
      if (isErrorValue(cond)) return cond;
      const b = toBoolean(cond);
      if (isErrorValue(b)) return b;
      if (b) return evaluate(args[1], ctx);
      return args[2] === undefined ? false : evaluate(args[2], ctx);
    },
  });
  def("IFS", {
    lazy: true,
    call: () => "#VALUE!",
    callLazy: (args, ctx) => {
      for (let i = 0; i + 1 < args.length; i += 2) {
        const cond = one(evaluate(args[i], ctx));
        if (isErrorValue(cond)) return cond;
        const b = toBoolean(cond);
        if (isErrorValue(b)) return b;
        if (b) return evaluate(args[i + 1], ctx);
      }
      return "#N/A"; // 어느 조건도 참이 아니면 엑셀은 #N/A다
    },
  });
  def("IFERROR", {
    lazy: true,
    call: () => "#VALUE!",
    callLazy: (args, ctx) => {
      if (args.length < 2) return "#VALUE!";
      const v = evaluate(args[0], ctx);
      const s = one(v);
      return isErrorValue(s) ? evaluate(args[1], ctx) : v;
    },
  });
  def("ISERROR", {
    lazy: true,
    call: () => "#VALUE!",
    callLazy: (args, ctx) =>
      args.length === 0 ? false : isErrorValue(one(evaluate(args[0], ctx))),
  });
  def("AND", {
    call: (args) => {
      const vs = flatten(args);
      if (vs.length === 0) return "#VALUE!";
      for (const v of vs) {
        if (v === null) continue; // 빈 셀은 무시(엑셀)
        const b = toBoolean(v);
        if (isErrorValue(b)) return b;
        if (!b) return false;
      }
      return true;
    },
  });
  def("OR", {
    call: (args) => {
      const vs = flatten(args);
      if (vs.length === 0) return "#VALUE!";
      let any = false;
      for (const v of vs) {
        if (v === null) continue;
        const b = toBoolean(v);
        if (isErrorValue(b)) return b;
        if (b) any = true;
      }
      return any;
    },
  });
  def("NOT", {
    call: (a) => {
      const b = toBoolean(one(a[0] ?? null));
      return isErrorValue(b) ? b : !b;
    },
  });
  def("ISBLANK", { call: (a) => one(a[0] ?? null) === null });
  def("ISNUMBER", { call: (a) => typeof one(a[0] ?? null) === "number" });
  def("ISTEXT", { call: (a) => typeof one(a[0] ?? null) === "string" });

  // ── 텍스트 ──────────────────────────────────────────────────────────────
  def("CONCAT", {
    call: (args) =>
      flatten(args)
        .map((v) => {
          const t = toText(v);
          return isErrorValue(t) ? "" : t;
        })
        .join(""),
  });
  def("LEN", { call: (a) => text1(a).length });
  def("TRIM", {
    // 엑셀의 TRIM은 양끝뿐 아니라 **가운데 연속 공백도 하나로** 줄인다.
    call: (a) => text1(a).replace(/\s+/g, " ").trim(),
  });
  def("UPPER", { call: (a) => text1(a).toUpperCase() });
  def("LOWER", { call: (a) => text1(a).toLowerCase() });
  def("LEFT", {
    call: (a) => {
      const n = a.length > 1 ? num1(a, 1) : 1;
      if (typeof n === "string") return n;
      return n < 0 ? "#VALUE!" : text1(a).slice(0, n);
    },
  });
  def("RIGHT", {
    call: (a) => {
      const n = a.length > 1 ? num1(a, 1) : 1;
      if (typeof n === "string") return n;
      if (n < 0) return "#VALUE!";
      const t = text1(a);
      return n === 0 ? "" : t.slice(Math.max(0, t.length - n));
    },
  });
  def("MID", {
    call: (a) => {
      const start = num1(a, 1);
      const len = num1(a, 2);
      if (typeof start === "string") return start;
      if (typeof len === "string") return len;
      // 엑셀의 MID는 **1-based**다. 0 이하는 #VALUE!.
      if (start < 1 || len < 0) return "#VALUE!";
      return text1(a).slice(start - 1, start - 1 + len);
    },
  });
  def("FIND", {
    call: (a) => {
      const needle = text1(a, 0);
      const hay = text1(a, 1);
      const from = a.length > 2 ? num1(a, 2) : 1;
      if (typeof from === "string") return from;
      if (from < 1) return "#VALUE!";
      // FIND는 대소문자를 가린다(가리지 않는 것은 SEARCH — 2차 목록).
      const i = hay.indexOf(needle, from - 1);
      return i < 0 ? "#VALUE!" : i + 1;
    },
  });
  def("SUBSTITUTE", {
    call: (a) => {
      const text = text1(a, 0);
      const from = text1(a, 1);
      const to = text1(a, 2);
      if (from === "") return text;
      if (a.length > 3) {
        const nth = num1(a, 3);
        if (typeof nth === "string") return nth;
        if (nth < 1) return "#VALUE!";
        let idx = -1;
        for (let k = 0; k < nth; k += 1) {
          idx = text.indexOf(from, idx + 1);
          if (idx < 0) return text;
        }
        return text.slice(0, idx) + to + text.slice(idx + from.length);
      }
      return text.split(from).join(to);
    },
  });
  def("TEXT", {
    // 서식 코드의 **일부만** 지원한다(스펙 7절: 전체 서식 엔진은 범위 밖).
    // 모르는 코드는 원문을 그대로 돌려준다 — 조용히 다른 모양으로 바꾸지 않는다.
    call: (a) => {
      const v = one(a[0] ?? null);
      const fmt = text1(a, 1);
      if (isErrorValue(v)) return v;
      return formatValue(v, fmt);
    },
  });

  // ── 날짜 ────────────────────────────────────────────────────────────────
  def("TODAY", { volatile: true, call: () => kstDateString(now()) });
  def("NOW", {
    volatile: true,
    call: () => {
      const d = now();
      const date = kstDateString(d);
      // KST 시:분:초. kstDateString과 같은 기준(+9)을 쓴다.
      const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      return `${date} ${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}:${pad2(kst.getUTCSeconds())}`;
    },
  });
  def("DATE", {
    call: (a) => {
      const y = num1(a, 0);
      const m = num1(a, 1);
      const d = num1(a, 2);
      if (typeof y === "string") return y;
      if (typeof m === "string") return m;
      if (typeof d === "string") return d;
      // 엑셀처럼 넘치는 월·일을 이월한다: DATE(2026,13,1) = 2027-01-01.
      const dt = new Date(Date.UTC(y, m - 1, d));
      if (Number.isNaN(dt.getTime())) return "#NUM!";
      return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
    },
  });
  def("YEAR", { call: (a) => datePart(a, "y") });
  def("MONTH", { call: (a) => datePart(a, "m") });
  def("DAY", { call: (a) => datePart(a, "d") });

  // ── 조회 ────────────────────────────────────────────────────────────────
  def("VLOOKUP", {
    call: (a) => {
      const key = one(a[0] ?? null);
      const grid = asGrid(a[1]);
      const colIdx = num1(a, 2);
      if (typeof colIdx === "string") return colIdx;
      if (colIdx < 1) return "#VALUE!";
      // 4번째 인자는 근사 일치다. 기본값 TRUE는 정렬을 전제해 틀리기 쉬워서
      // **우리는 기본을 정확 일치(FALSE)로 둔다** — 엑셀과 다른 지점이라 명시한다.
      const approx = a.length > 3 ? toBoolean(one(a[3])) === true : false;
      for (const row of grid) {
        if (row.length < colIdx) return "#REF!";
      }
      if (!approx) {
        const hit = grid.find((row) => looseEqual(row[0], key));
        return hit ? hit[colIdx - 1] : "#N/A";
      }
      // 근사 일치는 "키보다 크지 않은 것 중 마지막"이다(엑셀 — 정렬을 전제한다).
      let best: EvalValue = "#N/A";
      for (const row of grid) {
        if (compareLoose(row[0], key) <= 0) best = row[colIdx - 1];
      }
      return best;
    },
  });
  def("MATCH", {
    call: (a) => {
      const key = one(a[0] ?? null);
      const grid = asGrid(a[1]);
      const flat = grid.length === 1 ? grid[0] : grid.map((r) => r[0]);
      const idx = flat.findIndex((v) => looseEqual(v, key));
      return idx < 0 ? "#N/A" : idx + 1;
    },
  });
  def("INDEX", {
    call: (a) => {
      const grid = asGrid(a[0]);
      const r = num1(a, 1);
      if (typeof r === "string") return r;
      const c = a.length > 2 ? num1(a, 2) : 1;
      if (typeof c === "string") return c;
      // 1-based. 0은 "전체 행/열"을 뜻하는데 배열 반환이라 지원하지 않는다.
      if (r < 1 || c < 1) return "#VALUE!";
      const row = grid[r - 1];
      if (!row) return "#REF!";
      const v = row[c - 1];
      return v === undefined ? "#REF!" : v;
    },
  });
  def("XLOOKUP", {
    call: (a) => {
      const key = one(a[0] ?? null);
      const lookup = asGrid(a[1]);
      const result = asGrid(a[2]);
      const notFound = a.length > 3 ? one(a[3]) : "#N/A";
      const flatLookup = lookup.length === 1 ? lookup[0] : lookup.map((r) => r[0]);
      const idx = flatLookup.findIndex((v) => looseEqual(v, key));
      if (idx < 0) return notFound;
      const flatResult = result.length === 1 ? result[0] : result.map((r) => r[0]);
      const v = flatResult[idx];
      return v === undefined ? notFound : v;
    },
  });

  return fns;

  // ── 지역 도우미 ─────────────────────────────────────────────────────────
  function wrap1(a: EvalResult[], f: (n: number) => number): EvalResult {
    const n = num1(a);
    return typeof n === "string" ? n : f(n);
  }

  function roundLike(
    a: EvalResult[],
    f: (n: number, d: number) => number,
  ): EvalResult {
    const n = num1(a, 0);
    if (typeof n === "string") return n;
    const d = a.length > 1 ? num1(a, 1) : 0;
    if (typeof d === "string") return d;
    return f(n, Math.trunc(d));
  }

  function stepRound(a: EvalResult[], f: (n: number) => number): EvalResult {
    const n = num1(a, 0);
    if (typeof n === "string") return n;
    const step = a.length > 1 ? num1(a, 1) : 1;
    if (typeof step === "string") return step;
    if (step === 0) return 0;
    return f(n / step) * step;
  }

  function condAggregate(
    a: EvalResult[],
    mode: "sum" | "count" | "avg",
  ): EvalResult {
    const grid = asGrid(a[0]);
    const criteria = one(a[1] ?? null);
    // SUMIF의 3번째 인자는 "실제로 더할 범위"다. 없으면 조건 범위를 그대로 쓴다.
    const sumGrid = a.length > 2 ? asGrid(a[2]) : grid;
    let total = 0;
    let count = 0;
    for (let r = 0; r < grid.length; r += 1) {
      for (let c = 0; c < grid[r].length; c += 1) {
        if (!matchesCriteria(grid[r][c], criteria)) continue;
        count += 1;
        const target = sumGrid[r]?.[c];
        if (typeof target === "number") total += target;
      }
    }
    if (mode === "count") return count;
    if (mode === "sum") return total;
    return count === 0 ? "#DIV/0!" : total / count;
  }

  function datePart(a: EvalResult[], part: "y" | "m" | "d"): EvalResult {
    const v = one(a[0] ?? null);
    if (isErrorValue(v)) return v;
    const p = dateParts(v);
    if (!p) return "#VALUE!";
    return part === "y" ? p.y : part === "m" ? p.m : p.d;
  }
}

function one(v: EvalResult | undefined): EvalValue {
  if (v === undefined) return null;
  if (!Array.isArray(v)) return v;
  const first = v[0]?.[0];
  return first === undefined ? null : first;
}

/** 조회 함수의 일치 판정. 문자열은 대소문자를 가리지 않는다(엑셀). */
function looseEqual(a: EvalValue, b: EvalValue): boolean {
  if (typeof a === "string" && typeof b === "string") {
    return a.toUpperCase() === b.toUpperCase();
  }
  return a === b;
}

function compareLoose(a: EvalValue, b: EvalValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = (a === null ? "" : String(a)).toUpperCase();
  const sb = (b === null ? "" : String(b)).toUpperCase();
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/**
 * TEXT()의 서식. 지원하는 것만 적고 나머지는 원문을 돌려준다 —
 * 모르는 코드를 그럴듯하게 처리하면 사용자는 서식이 먹은 줄 안다.
 */
export function formatValue(v: EvalValue, fmt: string): string {
  const t = toText(v);
  if (isErrorValue(t)) return t;
  if (fmt === "") return t;

  if (/^(yyyy|YYYY)/.test(fmt)) {
    const p = dateParts(v);
    if (!p) return t;
    return fmt
      .replace(/yyyy|YYYY/, String(p.y))
      .replace(/mm|MM/, pad2(p.m))
      .replace(/dd|DD/, pad2(p.d));
  }

  const n = typeof v === "number" ? v : Number(t);
  if (!Number.isFinite(n)) return t;

  if (fmt.endsWith("%")) {
    const decimals = (fmt.match(/\.(0+)/)?.[1] ?? "").length;
    return `${(n * 100).toFixed(decimals)}%`;
  }
  const decimals = (fmt.match(/\.(0+)/)?.[1] ?? "").length;
  const fixed = Math.abs(n).toFixed(decimals);
  const [intPart, frac] = fixed.split(".");
  const grouped = fmt.includes(",")
    ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : intPart;
  const sign = n < 0 ? "-" : "";
  return frac ? `${sign}${grouped}.${frac}` : `${sign}${grouped}`;
}

/** 이 목록에 있는 함수 이름(관리 화면·자동완성이 쓴다). */
export function formulaFunctionNames(): string[] {
  return Object.keys(createFormulaFunctions()).sort();
}
