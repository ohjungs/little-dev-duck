// 2026-07-26 : 페이지 - RAG임베딩 - 행속성포함
// 데이터베이스 행(자식 페이지)의 속성값은 `row_props` 컬럼에 따로 저장되고 `plain_text`에는
// 들어가지 않는다(plain_text는 본문 content에서만 파생). 그래서 오리가 "진행 중인 프로젝트
// 뭐 있어?" 같은 질문에 **상태 값을 볼 수 없었다** — 제품 정의가 "오리는 RAG 기반으로
// 사용자의 데이터를 알고 답한다"인데 그 데이터의 일부가 빠져 있던 셈이다.
//
// plain_text 자체를 바꾸지 않는 이유: 속성만 고칠 때도 plain_text를 다시 파생하려면 본문을
// 함께 알아야 해서 편집 한 번마다 추가 조회가 붙는다. 임베딩 텍스트는 저장 컬럼과 별개로
// **호출부에서 조립**하는 게 이 저장소의 관례다(todoEmbedText가 같은 방식).

import type { RowPropValue, RowProps } from "./database-view";

// RowPropValue는 string | number | boolean | null이다(database-view.ts). 배열은 계약에 없으므로
// 처리하지 않는다 — 없는 형태를 미리 다루면 계약이 흐려진다.
function valueText(value: RowPropValue): string {
  if (value === null || value === undefined) return "";
  // false를 "값 없음"과 구분한다 — 체크박스가 꺼져 있다는 것도 정보다.
  if (typeof value === "boolean") return value ? "예" : "아니오";
  return String(value).trim();
}

// 페이지 RAG 임베딩 텍스트 = 본문 + 행 속성값("이름: 값" 줄).
// 데이터베이스 행은 본문이 비어 있는 경우가 흔하므로 속성만으로도 임베딩이 성립해야 한다.
export function pageEmbedText(plainText: string, rowProps: RowProps): string {
  const lines: string[] = [];
  const body = plainText.trim();
  if (body) lines.push(body);
  for (const [name, value] of Object.entries(rowProps ?? {})) {
    const text = valueText(value);
    if (text) lines.push(`${name}: ${text}`);
  }
  return lines.join("\n");
}
