import { isErrorValue } from "./formula-parse";
import {
  toNumber,
  toText,
  type EvalResult,
  type EvalValue,
} from "./formula-eval";

// 2026-08-02 : 스프레드시트 - 수식 함수 공용 헬퍼 (SPEC-2026-08-02-spreadsheet-a1 T10)
//
// T4(1차 53개)와 T10(2차 40개)이 **같은 변환 규칙**을 쓴다 — 범위 펼치기, 숫자 강제,
// 조건식(">10") 판정, 날짜 파싱. 파일이 갈리면서 이것들을 복사하면 한쪽만 고쳐지고,
// 그 어긋남은 "같은 조건인데 SUMIF와 SUMIFS가 다르게 센다"는 형태로 나타난다.

export function flatten(args: EvalResult[]): EvalValue[] {
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
export function numbersFromRanges(args: EvalResult[]): number[] | string {
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

export function num1(args: EvalResult[], i = 0): number | string {
  const v = args[i];
  if (Array.isArray(v)) return "#VALUE!";
  return toNumber(v === undefined ? null : v);
}

export function text1(args: EvalResult[], i = 0): string {
  const v = args[i];
  if (Array.isArray(v)) return "";
  const t = toText(v === undefined ? null : v);
  return isErrorValue(t) ? "" : t;
}

/** 엑셀의 반올림은 "0에서 먼 쪽"이다 — JS의 Math.round(-0.5)=-0과 다르다. */
export function roundHalfAway(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  const x = n * f;
  const r = x < 0 ? -Math.round(-x) : Math.round(x);
  return r / f;
}

// ── 조건 판정(SUMIF·COUNTIF) ────────────────────────────────────────────────
// 엑셀의 조건은 값 하나이거나 ">10" 같은 문자열이다. 후자를 파싱해야 한다.
// [\s\S]로 쓰는 이유: `.`+`s` 플래그는 es2018 이상에서만 되는데, apps/web의 빌드 타깃이
// 그보다 낮아 core 소스를 다시 타입체크할 때 깨진다(2026-08-02 CI가 잡음).
// 줄바꿈이 든 조건 문자열도 그대로 읽어야 하므로 `.`만 쓰는 것으로는 부족하다.
const CRITERIA_RE = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/;

export function matchesCriteria(value: EvalValue, criteria: EvalValue): boolean {
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

export function asGrid(v: EvalResult | undefined): EvalValue[][] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [[v]];
}

// ── 날짜 ───────────────────────────────────────────────────────────────────
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

export function dateParts(v: EvalValue): { y: number; m: number; d: number } | null {
  if (typeof v !== "string") return null;
  const m = DATE_RE.exec(v.trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export interface FormulaFnOptions {
  /** 시계. 주지 않으면 실제 시각을 쓴다. 검사는 반드시 고정 시각을 준다. */
  now?: () => Date;
}


export function one(v: EvalResult | undefined): EvalValue {
  if (v === undefined) return null;
  if (!Array.isArray(v)) return v;
  const first = v[0]?.[0];
  return first === undefined ? null : first;
}

/** 조회 함수의 일치 판정. 문자열은 대소문자를 가리지 않는다(엑셀). */
export function looseEqual(a: EvalValue, b: EvalValue): boolean {
  if (typeof a === "string" && typeof b === "string") {
    return a.toUpperCase() === b.toUpperCase();
  }
  return a === b;
}

export function compareLoose(a: EvalValue, b: EvalValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = (a === null ? "" : String(a)).toUpperCase();
  const sb = (b === null ? "" : String(b)).toUpperCase();
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

