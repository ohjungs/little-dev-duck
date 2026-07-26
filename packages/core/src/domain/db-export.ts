import type { DbRowLike, PropertyDef, RowPropValue } from "./database-view";

// 데이터베이스 뷰(행=자식 페이지)를 CSV 문자열로. 순수함수 — 다운로드/Blob은 UI가 담당.
// 열 순서: 제목 + 속성 정의 순. 값은 타입별로 사람이 읽는 형태(select=옵션명, checkbox=예/빈).

// 수식 인젝션(CSV Formula Injection) 방어: 셀 값이 =,+,@ 또는 제어문자(탭/CR)로 시작하면 Excel/Sheets가
// 수식으로 해석할 수 있어 앞에 작은따옴표를 붙여 텍스트로 강제한다. '-'는 음수(-5 등) 오탐이 잦아 제외
// (개인 워크스페이스 export라 위험도 낮음 — 리뷰 MEDIUM). 접두 후 RFC 이스케이프를 적용한다.
const FORMULA_START = /^[=+@\t\r]/;
function neutralizeFormula(field: string): string {
  return FORMULA_START.test(field) ? `'${field}` : field;
}

// RFC 4180: 콤마·따옴표·개행이 있으면 따옴표로 감싸고 내부 따옴표는 이중화.
function escapeCsv(field: string): string {
  const guarded = neutralizeFormula(field);
  return /[",\n\r]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

// 한 셀 값을 표시 문자열로. select는 옵션 이름(미지의 id는 빈 칸), checkbox는 예/빈, 그 외는 문자열화.
function cellText(prop: PropertyDef, value: RowPropValue | undefined): string {
  if (value === null || value === undefined) return "";
  switch (prop.type) {
    case "select":
      return prop.options.find((o) => o.id === value)?.name ?? "";
    case "checkbox":
      return value ? "예" : "";
    default:
      return String(value);
  }
}

// 2026-07-27 : CSV - 공용 조립 (Phase 46 T3)
// 차트 데이터도 CSV로 내보내게 되면서 **같은 이스케이프가 두 곳에 필요해졌다.**
// 복붙하면 수식 인젝션 방어가 한쪽에만 남는다 — 그건 보안 결함이 조용히 갈라지는 것이다.
// 그래서 표 조립만 여기로 올린다(`rowsToCsv`도 이걸 쓴다).
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function rowsToCsv(
  rows: readonly DbRowLike[],
  properties: readonly PropertyDef[],
): string {
  // 이스케이프·조립은 `toCsv` 한 벌이 한다 — 여기서 다시 하면 두 벌이 된다.
  return toCsv([
    ["제목", ...properties.map((p) => p.name)],
    ...rows.map((row) => [
      row.title,
      ...properties.map((p) => cellText(p, row.rowProps[p.id])),
    ]),
  ]);
}
