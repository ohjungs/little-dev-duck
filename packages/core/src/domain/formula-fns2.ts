import { parseCellRange, parseCellRef, type CellRef } from "./sheet";
import type { Node } from "./formula-parse";
import {
  evaluate,
  toNumber,
  toText,
  type EvalContext,
  type EvalResult,
  type EvalValue,
  type FunctionRegistry,
} from "./formula-eval";
import {
  asGrid,
  compareLoose,
  dateParts,
  flatten,
  looseEqual,
  matchesCriteria,
  num1,
  numbersFromRanges,
  one,
  pad2,
  text1,
} from "./formula-fn-helpers";

// 2026-08-02 : 스프레드시트 - 수식 함수 2차 40개 (SPEC-2026-08-02-spreadsheet-a1 T10)
//
// 1차(T4, formula-fns.ts)와 **같은 헬퍼**를 쓴다(formula-fn-helpers.ts) — 조건식 판정이
// SUMIF와 SUMIFS에서 갈라지면 사용자는 그 차이를 설명할 수 없다.
//
// 날짜는 스펙 D-4대로 `YYYY-MM-DD` 문자열이다(엑셀의 1900 일련번호가 아니다).
// 그래서 날짜 계산은 UTC 자정으로 만든 Date로 하고 다시 문자열로 돌린다 — 시간대가 섞이면
// 하루가 밀린다.

function toUtcDate(v: EvalValue): Date | null {
  const p = dateParts(v);
  return p === null ? null : new Date(Date.UTC(p.y, p.m - 1, p.d));
}

function fromUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

const DAY_MS = 86_400_000;

/** "13:45:30" 또는 "2026-08-02 13:45:30"에서 시:분:초. */
function timeParts(v: EvalValue): { h: number; m: number; s: number } | null {
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(toText(v) as string);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = m[3] === undefined ? 0 : Number(m[3]);
  if (h > 23 || min > 59 || s > 59) return null;
  return { h, m: min, s };
}

/** 조건 짝(범위, 조건)들을 모두 만족하는 인덱스만 남긴다. SUMIFS·COUNTIFS·AVERAGEIFS 공용. */
function matchingIndexes(pairs: EvalResult[], startAt: number): number[] | string {
  const first = flatten([pairs[startAt]]);
  const keep: number[] = [];
  for (let i = 0; i < first.length; i += 1) {
    let ok = true;
    for (let p = startAt; p + 1 < pairs.length; p += 2) {
      const values = flatten([pairs[p]]);
      if (values.length !== first.length) return "#VALUE!";
      if (!matchesCriteria(values[i], one(pairs[p + 1]))) {
        ok = false;
        break;
      }
    }
    if (ok) keep.push(i);
  }
  return keep;
}

function numbersOf(values: readonly EvalValue[]): number[] | string {
  const out: number[] = [];
  for (const v of values) {
    if (v === null || v === "") continue;
    const n = toNumber(v);
    if (typeof n === "string") return n;
    out.push(n);
  }
  return out;
}

/** 참조 노드에서 좌상단 좌표를 얻는다(OFFSET의 기준). */
function anchorOf(node: Node | undefined): CellRef | null {
  if (!node) return null;
  if (node.kind === "ref") return node.ref;
  if (node.kind === "range") return node.range.start;
  return null;
}

export function createSecondaryFunctions(): FunctionRegistry {
  const fns: FunctionRegistry = {};
  const def = (name: string, d: FunctionRegistry[string]): void => {
    fns[name] = d;
  };

  // ── 조건 집계 ──────────────────────────────────────────────────────────────
  def("SUMIFS", {
    call: (args) => {
      const target = flatten([args[0]]);
      const idx = matchingIndexes(args, 1);
      if (typeof idx === "string") return idx;
      let sum = 0;
      for (const i of idx) {
        const n = toNumber(target[i] ?? null);
        if (typeof n === "string") return n;
        sum += n;
      }
      return sum;
    },
  });
  def("COUNTIFS", {
    call: (args) => {
      const idx = matchingIndexes(args, 0);
      return typeof idx === "string" ? idx : idx.length;
    },
  });
  def("AVERAGEIFS", {
    call: (args) => {
      const target = flatten([args[0]]);
      const idx = matchingIndexes(args, 1);
      if (typeof idx === "string") return idx;
      const ns: number[] = [];
      for (const i of idx) {
        const v = target[i] ?? null;
        // 빈 칸은 평균의 분모에 넣지 않는다(AVERAGE와 같은 규칙 — AC-6).
        if (v === null || v === "") continue;
        const n = toNumber(v);
        if (typeof n === "string") return n;
        ns.push(n);
      }
      if (ns.length === 0) return "#DIV/0!";
      return ns.reduce((a, b) => a + b, 0) / ns.length;
    },
  });
  def("SUMPRODUCT", {
    call: (args) => {
      if (args.length === 0) return 0;
      const lists = args.map((a) => flatten([a]));
      const len = lists[0].length;
      if (lists.some((l) => l.length !== len)) return "#VALUE!";
      let sum = 0;
      for (let i = 0; i < len; i += 1) {
        let product = 1;
        for (const list of lists) {
          const v = list[i];
          // 숫자가 아닌 칸은 0으로 본다(엑셀과 같다 — 글자가 섞여도 오류가 아니다).
          const n = v === null || typeof v === "string" ? Number(v) || 0 : toNumber(v);
          if (typeof n === "string") return n;
          product *= n;
        }
        sum += product;
      }
      return sum;
    },
  });

  // ── 통계 ──────────────────────────────────────────────────────────────────
  const variance = (args: EvalResult[]): number | string => {
    const ns = numbersFromRanges(args);
    if (typeof ns === "string") return ns;
    if (ns.length < 2) return "#DIV/0!"; // 표본 분산은 n-1로 나눈다
    const mean = ns.reduce((a, b) => a + b, 0) / ns.length;
    return ns.reduce((a, b) => a + (b - mean) ** 2, 0) / (ns.length - 1);
  };
  def("VAR", { call: (a) => variance(a) });
  def("STDEV", {
    call: (a) => {
      const v = variance(a);
      return typeof v === "string" ? v : Math.sqrt(v);
    },
  });
  def("PERCENTILE", {
    call: (args) => {
      const ns = numbersFromRanges([args[0]]);
      if (typeof ns === "string") return ns;
      const k = num1(args, 1);
      if (typeof k === "string") return k;
      if (ns.length === 0 || k < 0 || k > 1) return "#NUM!";
      const sorted = [...ns].sort((a, b) => a - b);
      // 엑셀 PERCENTILE.INC와 같은 선형 보간.
      const pos = k * (sorted.length - 1);
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
    },
  });
  def("RANK", {
    call: (args) => {
      const x = num1(args, 0);
      if (typeof x === "string") return x;
      const ns = numbersFromRanges([args[1]]);
      if (typeof ns === "string") return ns;
      if (!ns.includes(x)) return "#N/A";
      const ascending = args.length > 2 && toNumber(one(args[2])) !== 0;
      const sorted = [...ns].sort((a, b) => (ascending ? a - b : b - a));
      return sorted.indexOf(x) + 1;
    },
  });
  const nth = (args: EvalResult[], largest: boolean): EvalResult => {
    const ns = numbersFromRanges([args[0]]);
    if (typeof ns === "string") return ns;
    const k = num1(args, 1);
    if (typeof k === "string") return k;
    if (!Number.isInteger(k) || k < 1 || k > ns.length) return "#NUM!";
    const sorted = [...ns].sort((a, b) => (largest ? b - a : a - b));
    return sorted[k - 1];
  };
  def("LARGE", { call: (a) => nth(a, true) });
  def("SMALL", { call: (a) => nth(a, false) });

  // ── 배열 ──────────────────────────────────────────────────────────────────
  def("UNIQUE", {
    call: (args) => {
      const seen: EvalValue[] = [];
      for (const v of flatten([args[0]])) {
        if (v === null) continue;
        if (!seen.some((s) => looseEqual(s, v))) seen.push(v);
      }
      return seen.map((v) => [v]);
    },
  });
  def("SORT", {
    call: (args) => {
      const grid = asGrid(args[0]);
      const byCol = args.length > 1 ? Number(toNumber(one(args[1]))) : 1;
      const dir = args.length > 2 ? Number(toNumber(one(args[2]))) : 1;
      const c = Math.max(0, byCol - 1);
      const rows = [...grid].sort((a, b) => compareLoose(a[c] ?? null, b[c] ?? null));
      return dir < 0 ? rows.reverse() : rows;
    },
  });
  def("FILTER", {
    call: (args) => {
      const grid = asGrid(args[0]);
      const flags = flatten([args[1]]);
      const kept = grid.filter((_, i) => {
        const f = flags[i];
        return f === true || (typeof f === "number" && f !== 0);
      });
      // 남는 것이 없으면 #N/A다(엑셀과 같다 — 빈 배열은 셀에 표시할 수 없다).
      return kept.length === 0 ? "#N/A" : kept;
    },
  });
  def("SEQUENCE", {
    call: (args) => {
      const rows = num1(args, 0);
      if (typeof rows === "string") return rows;
      const cols = args.length > 1 ? num1(args, 1) : 1;
      if (typeof cols === "string") return cols;
      const start = args.length > 2 ? num1(args, 2) : 1;
      if (typeof start === "string") return start;
      const step = args.length > 3 ? num1(args, 3) : 1;
      if (typeof step === "string") return step;
      if (rows < 1 || cols < 1 || rows * cols > 100_000) return "#NUM!";
      const out: EvalValue[][] = [];
      let n = start;
      for (let r = 0; r < Math.floor(rows); r += 1) {
        const row: EvalValue[] = [];
        for (let c = 0; c < Math.floor(cols); c += 1) {
          row.push(n);
          n += step;
        }
        out.push(row);
      }
      return out;
    },
  });
  def("TRANSPOSE", {
    call: (args) => {
      const grid = asGrid(args[0]);
      if (grid.length === 0) return "#VALUE!";
      const out: EvalValue[][] = [];
      for (let c = 0; c < grid[0].length; c += 1) {
        out.push(grid.map((row) => row[c] ?? null));
      }
      return out;
    },
  });

  // ── 텍스트·조회 ───────────────────────────────────────────────────────────
  def("TEXTJOIN", {
    call: (args) => {
      const sep = text1(args, 0);
      const skipEmpty = args[1] === true || toNumber(one(args[1])) !== 0;
      const parts: string[] = [];
      for (const v of flatten(args.slice(2))) {
        const t = toText(v);
        if (typeof t !== "string") return t;
        if (skipEmpty && t === "") continue;
        parts.push(t);
      }
      return parts.join(sep);
    },
  });
  def("CHOOSE", {
    call: (args) => {
      const i = num1(args, 0);
      if (typeof i === "string") return i;
      const picked = args[Math.floor(i)];
      if (i < 1 || picked === undefined) return "#VALUE!";
      return picked;
    },
  });
  def("HLOOKUP", {
    call: (args) => {
      const key = one(args[0]);
      const grid = asGrid(args[1]);
      const rowIndex = num1(args, 2);
      if (typeof rowIndex === "string") return rowIndex;
      if (grid.length === 0 || rowIndex < 1 || rowIndex > grid.length) return "#REF!";
      const header = grid[0];
      for (let c = 0; c < header.length; c += 1) {
        if (looseEqual(header[c], key)) return grid[rowIndex - 1][c] ?? null;
      }
      return "#N/A";
    },
  });
  def("INDIRECT", {
    call: (args, ctx) => {
      const text = text1(args, 0);
      const range = parseCellRange(text);
      if (range) return ctx.getRange(range);
      const ref = parseCellRef(text);
      if (!ref) return "#REF!";
      ctx.onRead?.(ref);
      return ctx.getCell(ref);
    },
  });
  def("OFFSET", {
    // 첫 인자의 **값이 아니라 참조**가 필요하므로 AST를 그대로 받는다.
    lazy: true,
    call: () => "#VALUE!", // lazy라 쓰이지 않는다(IF와 같은 관례)
    callLazy: (nodes, ctx: EvalContext) => {
      const base = anchorOf(nodes[0]);
      if (!base) return "#REF!";
      const evalNum = (node: Node | undefined, fallback: number): number | string => {
        if (!node) return fallback;
        const v = evaluate(node, ctx);
        return toNumber(one(v));
      };
      const dr = evalNum(nodes[1], 0);
      if (typeof dr === "string") return dr;
      const dc = evalNum(nodes[2], 0);
      if (typeof dc === "string") return dc;
      const h = evalNum(nodes[3], 1);
      if (typeof h === "string") return h;
      const w = evalNum(nodes[4], 1);
      if (typeof w === "string") return w;

      const r = base.r + dr;
      const c = base.c + dc;
      if (r < 0 || c < 0 || h < 1 || w < 1) return "#REF!";
      if (h === 1 && w === 1) {
        const ref = { ...base, r, c };
        ctx.onRead?.(ref);
        return ctx.getCell(ref);
      }
      return ctx.getRange({
        start: { ...base, r, c },
        end: { ...base, r: r + h - 1, c: c + w - 1 },
      });
    },
  });

  // ── 날짜·시간 ─────────────────────────────────────────────────────────────
  def("DATEDIF", {
    call: (args) => {
      const a = toUtcDate(one(args[0]));
      const b = toUtcDate(one(args[1]));
      const unit = text1(args, 2).toUpperCase();
      if (!a || !b) return "#VALUE!";
      if (a.getTime() > b.getTime()) return "#NUM!";
      if (unit === "D") return Math.round((b.getTime() - a.getTime()) / DAY_MS);
      const months =
        (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
        (b.getUTCMonth() - a.getUTCMonth()) -
        (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
      if (unit === "M") return months;
      if (unit === "Y") return Math.floor(months / 12);
      return "#NUM!";
    },
  });
  def("EOMONTH", {
    call: (args) => {
      const d = toUtcDate(one(args[0]));
      const months = num1(args, 1);
      if (!d) return "#VALUE!";
      if (typeof months === "string") return months;
      // 다음 달 0일 = 이 달의 마지막 날.
      return fromUtcDate(
        new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0)),
      );
    },
  });
  def("WEEKDAY", {
    call: (args) => {
      const d = toUtcDate(one(args[0]));
      if (!d) return "#VALUE!";
      // 엑셀 기본(type 1): 일요일이 1.
      return d.getUTCDay() + 1;
    },
  });
  def("NETWORKDAYS", {
    call: (args) => {
      const a = toUtcDate(one(args[0]));
      const b = toUtcDate(one(args[1]));
      if (!a || !b) return "#VALUE!";
      const [from, to] = a <= b ? [a, b] : [b, a];
      let count = 0;
      for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
        const day = new Date(t).getUTCDay();
        if (day !== 0 && day !== 6) count += 1;
      }
      return a <= b ? count : -count;
    },
  });
  def("WORKDAY", {
    call: (args) => {
      const d = toUtcDate(one(args[0]));
      const days = num1(args, 1);
      if (!d) return "#VALUE!";
      if (typeof days === "string") return days;
      const step = days >= 0 ? DAY_MS : -DAY_MS;
      let left = Math.abs(Math.floor(days));
      let t = d.getTime();
      while (left > 0) {
        t += step;
        const day = new Date(t).getUTCDay();
        if (day !== 0 && day !== 6) left -= 1;
      }
      return fromUtcDate(new Date(t));
    },
  });
  const timePart = (key: "h" | "m" | "s") => ({
    call: (args: EvalResult[]): EvalResult => {
      const p = timeParts(one(args[0]));
      return p === null ? "#VALUE!" : p[key];
    },
  });
  def("HOUR", timePart("h"));
  def("MINUTE", timePart("m"));
  def("SECOND", timePart("s"));

  // ── 재무 ──────────────────────────────────────────────────────────────────
  // 부호 규약은 엑셀과 같다: 나가는 돈이 음수다. 그래서 대출 상환액 PMT는 음수로 나온다.
  def("PMT", {
    call: (args) => {
      const rate = num1(args, 0);
      const nper = num1(args, 1);
      const pv = num1(args, 2);
      if (typeof rate === "string") return rate;
      if (typeof nper === "string") return nper;
      if (typeof pv === "string") return pv;
      const fv = args.length > 3 ? num1(args, 3) : 0;
      if (typeof fv === "string") return fv;
      if (nper === 0) return "#NUM!";
      if (rate === 0) return -(pv + fv) / nper;
      const p = Math.pow(1 + rate, nper);
      return -(pv * p + fv) * (rate / (p - 1));
    },
  });
  def("FV", {
    call: (args) => {
      const rate = num1(args, 0);
      const nper = num1(args, 1);
      const pmt = num1(args, 2);
      if (typeof rate === "string") return rate;
      if (typeof nper === "string") return nper;
      if (typeof pmt === "string") return pmt;
      const pv = args.length > 3 ? num1(args, 3) : 0;
      if (typeof pv === "string") return pv;
      if (rate === 0) return -(pv + pmt * nper);
      const p = Math.pow(1 + rate, nper);
      return -(pv * p + pmt * ((p - 1) / rate));
    },
  });
  def("PV", {
    call: (args) => {
      const rate = num1(args, 0);
      const nper = num1(args, 1);
      const pmt = num1(args, 2);
      if (typeof rate === "string") return rate;
      if (typeof nper === "string") return nper;
      if (typeof pmt === "string") return pmt;
      const fv = args.length > 3 ? num1(args, 3) : 0;
      if (typeof fv === "string") return fv;
      if (rate === 0) return -(fv + pmt * nper);
      const p = Math.pow(1 + rate, nper);
      return -(fv + pmt * ((p - 1) / rate)) / p;
    },
  });
  def("NPV", {
    call: (args) => {
      const rate = num1(args, 0);
      if (typeof rate === "string") return rate;
      const flows = numbersOf(flatten(args.slice(1)));
      if (typeof flows === "string") return flows;
      let sum = 0;
      flows.forEach((v, i) => {
        sum += v / Math.pow(1 + rate, i + 1);
      });
      return sum;
    },
  });
  def("IRR", {
    call: (args) => {
      const flows = numbersOf(flatten([args[0]]));
      if (typeof flows === "string") return flows;
      if (flows.length < 2) return "#NUM!";
      // 부호가 한 번도 바뀌지 않으면 해가 없다 — 반복을 돌리기 전에 걸러낸다.
      const hasPositive = flows.some((v) => v > 0);
      const hasNegative = flows.some((v) => v < 0);
      if (!hasPositive || !hasNegative) return "#NUM!";
      const npv = (rate: number): number =>
        flows.reduce((acc, v, i) => acc + v / Math.pow(1 + rate, i), 0);
      // 이분법. 뉴턴법은 시작점에 따라 발산해서 "가끔 틀린 값"을 내는데, 재무 수치에서
      // 그건 조용한 오답이다. 느려도 수렴이 보장되는 쪽을 쓴다(100회면 충분하다).
      let lo = -0.999999;
      let hi = 10;
      if (npv(lo) * npv(hi) > 0) return "#NUM!";
      for (let i = 0; i < 100; i += 1) {
        const mid = (lo + hi) / 2;
        if (npv(lo) * npv(mid) <= 0) hi = mid;
        else lo = mid;
      }
      return (lo + hi) / 2;
    },
  });

  // ── 수학 나머지 ───────────────────────────────────────────────────────────
  def("CEILING.MATH", {
    call: (args) => {
      const x = num1(args, 0);
      if (typeof x === "string") return x;
      const step = args.length > 1 ? num1(args, 1) : 1;
      if (typeof step === "string") return step;
      if (step === 0) return 0;
      return Math.ceil(x / step) * step;
    },
  });
  def("TRUNC", {
    call: (args) => {
      const x = num1(args, 0);
      if (typeof x === "string") return x;
      const digits = args.length > 1 ? num1(args, 1) : 0;
      if (typeof digits === "string") return digits;
      const p = Math.pow(10, Math.floor(digits));
      return Math.trunc(x * p) / p;
    },
  });
  def("SIGN", { call: (a) => wrapNum(a, Math.sign) });
  def("EXP", { call: (a) => wrapNum(a, Math.exp) });
  def("LN", {
    call: (a) => {
      const x = num1(a, 0);
      if (typeof x === "string") return x;
      return x <= 0 ? "#NUM!" : Math.log(x);
    },
  });
  def("LOG", {
    call: (args) => {
      const x = num1(args, 0);
      if (typeof x === "string") return x;
      const base = args.length > 1 ? num1(args, 1) : 10;
      if (typeof base === "string") return base;
      if (x <= 0 || base <= 0 || base === 1) return "#NUM!";
      return Math.log(x) / Math.log(base);
    },
  });
  def("RANDBETWEEN", {
    volatile: true,
    call: (args) => {
      const lo = num1(args, 0);
      const hi = num1(args, 1);
      if (typeof lo === "string") return lo;
      if (typeof hi === "string") return hi;
      if (hi < lo) return "#NUM!";
      return Math.floor(lo + Math.random() * (Math.floor(hi) - Math.ceil(lo) + 1));
    },
  });

  return fns;
}

function wrapNum(args: EvalResult[], fn: (n: number) => number): EvalResult {
  const n = num1(args, 0);
  return typeof n === "string" ? n : fn(n);
}
