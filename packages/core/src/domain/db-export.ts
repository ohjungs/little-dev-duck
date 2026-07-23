import type { DbRowLike, PropertyDef, RowPropValue } from "./database-view";

// 데이터베이스 뷰(행=자식 페이지)를 CSV 문자열로. 순수함수 — 다운로드/Blob은 UI가 담당.
// 열 순서: 제목 + 속성 정의 순. 값은 타입별로 사람이 읽는 형태(select=옵션명, checkbox=예/빈).

// RFC 4180: 콤마·따옴표·개행이 있으면 따옴표로 감싸고 내부 따옴표는 이중화.
function escapeCsv(field: string): string {
  return /[",\n\r]/.test(field)
    ? `"${field.replace(/"/g, '""')}"`
    : field;
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

export function rowsToCsv(
  rows: readonly DbRowLike[],
  properties: readonly PropertyDef[],
): string {
  const header = ["제목", ...properties.map((p) => p.name)]
    .map(escapeCsv)
    .join(",");
  const lines = rows.map((row) =>
    [row.title, ...properties.map((p) => cellText(p, row.rowProps[p.id]))]
      .map(escapeCsv)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
