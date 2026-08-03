import { isErrorValue } from "./formula-parse";
import { formatValue } from "./formula-fns";
import type { EvalValue } from "./formula-eval";
import type { CellStyle } from "./sheet";

// 2026-08-02 : 스프레드시트 - 서식 (SPEC-2026-08-02-spreadsheet-a1 T7)
//
// 서식은 셀 행에 담지 않고 **시트 메타의 팔레트(meta.styles) 인덱스**로 가리킨다(계약은 T1이
// 잡았다: cellSchema.s). 같은 서식을 쓰는 셀 1만 개가 팔레트 항목 하나를 공유하므로 셀 행이
// 가볍게 남고, 서식만 바꿀 때 셀을 다시 쓰지 않아도 되는 길이 열린다.
//
// 그 대가가 **중복 제거**다. 같은 서식을 매번 새 항목으로 넣으면 팔레트가 셀 수만큼 자라
// jsonb 한 덩어리 문제가 meta로 옮겨온다. 그래서 여기서 한 번만 정규화해 비교한다.

// 스키마(sheetMetaSchema.styles)의 상한과 같아야 한다. 넘으면 저장이 거부된다.
export const MAX_STYLES = 512;

/** 값이 있는 속성만 남긴 정규형. `bold: false`는 "굵지 않다"가 아니라 **없는 것**으로 둔다. */
function clean(style: CellStyle): CellStyle {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) {
    if (v === undefined || v === false || v === "") continue;
    out[k] = v;
  }
  return out as CellStyle;
}

/** 비교용 문자열. 키 순서가 달라도 같은 서식이면 같은 글자가 나와야 한다. */
function keyOf(style: CellStyle): string {
  const entries = Object.entries(clean(style)).sort(([a], [b]) => (a < b ? -1 : 1));
  return JSON.stringify(entries);
}

export function styleAt(styles: readonly CellStyle[], index: number | null): CellStyle {
  if (index === null || index < 0 || index >= styles.length) return {};
  return styles[index];
}

/**
 * 셀의 현재 서식(index)에 patch를 얹어 새 팔레트와 인덱스를 만든다.
 *
 * - 결과가 기본 서식이면 index는 null이다(팔레트에 빈 항목을 만들지 않는다).
 * - 같은 서식이 이미 있으면 그 인덱스를 재사용한다.
 * - **기존 항목을 고치지 않는다.** 다른 셀이 같은 인덱스를 보고 있을 수 있어서다.
 * - 팔레트가 꽉 찼는데 새 서식이 필요하면 **null**을 돌려준다. 조용히 무시하면 사용자는
 *   서식이 먹은 줄 알고, 마지막에 저장이 거부되는 것보다 지금 알리는 편이 낫다.
 */
export function applyStyle(
  styles: readonly CellStyle[],
  index: number | null,
  patch: Partial<CellStyle>,
): { styles: CellStyle[]; index: number | null } | null {
  const merged = clean({ ...styleAt(styles, index), ...patch });
  const list = [...styles];

  if (Object.keys(merged).length === 0) return { styles: list, index: null };

  const key = keyOf(merged);
  const found = list.findIndex((s) => keyOf(s) === key);
  if (found >= 0) return { styles: list, index: found };

  if (list.length >= MAX_STYLES) return null;
  list.push(merged);
  return { styles: list, index: list.length - 1 };
}

// 기본 표시. 숫자 서식이 없을 때의 규칙이고, 0.1+0.2가 "0.30000000000000004"로 보이지 않게
// 유효숫자 15자리에서 끊는다(엑셀과 같다).
function defaultText(v: EvalValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "#NUM!";
    return String(Number(v.toPrecision(15)));
  }
  return String(v);
}

/**
 * 셀에 보일 글자. 숫자 서식(numFmt)이 있으면 그것을 따르고, 없으면 기본 표시다.
 * 오류값에는 서식을 씌우지 않는다 — `#DIV/0!`이 `0`으로 보이면 안 된다.
 */
export function displayCellText(v: EvalValue, style: CellStyle): string {
  if (typeof v === "string" && isErrorValue(v)) return v;
  if (!style.numFmt) return defaultText(v);
  // TEXT()와 같은 해석기를 쓴다. 두 벌로 두면 =TEXT(A1,"#,##0")과 셀 서식이 서로 다르게 나온다.
  return formatValue(v, style.numFmt);
}

/** 이 셀을 어느 쪽으로 붙일 것인가. 서식이 정하지 않았으면 숫자는 오른쪽, 나머지는 왼쪽이다. */
export function alignOf(style: CellStyle, numeric: boolean): "left" | "center" | "right" {
  return style.align ?? (numeric ? "right" : "left");
}
