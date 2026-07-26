import { z } from "zod";
import { TITLE_PROP_ID, type PropertyType, type RowPropValue } from "./database-view";

// 2026-07-26 : 데이터베이스 - 집계 - 순수계산 (Phase 33 T1)
// 사용자 요구는 "페이지 안에 엑셀 기능"이었다. 표에서 실제로 아쉬운 건 **합계가 안 보인다**이지
// 식을 쓰고 싶은 게 아니다 — 그래서 `=SUM(...)` 문자열을 파싱하지 않는다.
// 파서를 들이면 순환 참조 검사·오류 표기·새 주입 표면이 따라온다(미니 프로그래밍 언어다).
// 대신 **열마다 집계 종류를 고르고 표 아래 줄에 보여준다**(노션의 "계산" 행과 같은 형태).
//
// 순수함수다. 조회도 렌더도 하지 않는다.

export const AGGREGATIONS = [
  "none",
  "count",
  "filled",
  "empty",
  "sum",
  "avg",
  "min",
  "max",
  "checked",
] as const;
export const aggregationKindSchema = z.enum(AGGREGATIONS);
export type AggregationKind = z.infer<typeof aggregationKindSchema>;

// 집계 계산에 필요한 최소 행 모양. 페이지 전체를 받지 않는다 — core는 DB 행을 모른다.
export type AggregationRow = {
  title: string;
  props: Record<string, RowPropValue | undefined>;
};

const LABELS: Record<AggregationKind, string> = {
  none: "없음",
  count: "개수",
  filled: "채워짐",
  empty: "비어 있음",
  sum: "합계",
  avg: "평균",
  min: "최소",
  max: "최대",
  checked: "체크됨",
};

export function aggregationLabel(kind: AggregationKind): string {
  return LABELS[kind];
}

// 어떤 타입에서나 셀 수 있는 것들. 값의 의미를 몰라도 "있다/없다/몇 개"는 말할 수 있다.
const UNIVERSAL: AggregationKind[] = ["none", "count", "filled", "empty"];

// **타입에 맞지 않는 집계는 애초에 고를 수 없게 한다.** 고를 수 있게 두면 사용자는 텍스트 열에
// 합계를 걸고 "왜 0이지"를 겪는다. 화면에서 답을 주는 대신 선택지에서 뺀다.
export function aggregationsForType(type: PropertyType): AggregationKind[] {
  if (type === "number") return [...UNIVERSAL, "sum", "avg", "min", "max"];
  if (type === "checkbox") return [...UNIVERSAL, "checked"];
  return [...UNIVERSAL];
}

function cellOf(row: AggregationRow, propId: string): RowPropValue | undefined {
  // 제목은 row_props가 아니라 별도 필드다(정렬·필터가 쓰는 규칙과 같다).
  return propId === TITLE_PROP_ID ? row.title : row.props[propId];
}

// 사용자 눈에 "빈 칸"인 것: 값이 없거나 공백뿐인 문자열. false는 빈 칸이 아니다(체크 안 한 상태다).
function isEmpty(v: RowPropValue | undefined): boolean {
  if (v === undefined || v === null) return true;
  return typeof v === "string" && v.trim() === "";
}

// 가져오기·붙여넣기로 "1200"이 문자열로 들어오는 경우가 실제로 있어 숫자 문자열도 받는다.
// 다만 **숫자가 아닌 문자열을 0으로 강등하지 않는다** — 그러면 평균이 조용히 틀어진다.
function toNumber(v: RowPropValue | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// 결과가 없을 수 있다: none은 애초에 안 세고, 평균·최소·최대는 **숫자가 하나도 없으면 값이 없다**.
// 그때 0을 내면 "평균이 0"이라는 틀린 말이 된다 — 모르는 건 모른다고 한다.
// 반면 합계는 0이 맞다(더할 게 없으면 0).
export function computeAggregation(
  rows: readonly AggregationRow[],
  propId: string,
  kind: AggregationKind,
): number | null {
  if (kind === "none") return null;
  if (kind === "count") return rows.length;

  if (kind === "filled" || kind === "empty") {
    const empty = rows.filter((r) => isEmpty(cellOf(r, propId))).length;
    return kind === "empty" ? empty : rows.length - empty;
  }

  if (kind === "checked") {
    return rows.filter((r) => cellOf(r, propId) === true).length;
  }

  const nums: number[] = [];
  for (const r of rows) {
    const n = toNumber(cellOf(r, propId));
    if (n !== null) nums.push(n);
  }
  if (kind === "sum") return nums.reduce((a, b) => a + b, 0);
  if (nums.length === 0) return null;
  if (kind === "avg") return nums.reduce((a, b) => a + b, 0) / nums.length;
  // Math.min(...nums)는 배열이 크면 인자 개수 상한에 걸려 터진다(표는 수천 행이 될 수 있다).
  if (kind === "min") return nums.reduce((a, b) => (b < a ? b : a));
  return nums.reduce((a, b) => (b > a ? b : a));
}

// 숫자만 덩그러니 있으면 그게 합인지 개수인지 알 수 없어 이름을 함께 낸다.
export function formatAggregation(kind: AggregationKind, value: number | null): string {
  if (kind === "none" || value === null) return "";
  // 1/3 같은 값이 그대로 나오면 칸을 넘긴다. 정수면 소수점을 붙이지 않는다.
  const shown = Number.isInteger(value)
    ? value.toLocaleString("ko-KR")
    : value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  return `${LABELS[kind]} ${shown}`;
}
