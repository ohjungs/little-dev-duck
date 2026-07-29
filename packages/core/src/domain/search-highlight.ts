// 2026-07-29 : 메신저 - 검색 하이라이트 (Phase 51 T3 잔여 L-002)
//
// 검색 결과에서 **어디가 맞았는지**를 표시할 조각을 만든다. HTML 문자열을 만들지 않는다 —
// 이 본문엔 에이전트 응답도 섞이므로 화면은 조각을 React 요소로 그린다(평문 렌더 원칙 유지).
//
// 정규식을 쓰지 않는다. 검색어의 `$`·`(` 같은 문자를 이스케이프하는 코드는
// 한 글자만 빠져도 검색어가 패턴으로 동작한다 — indexOf 순회가 그 실수 자체를 없앤다.

export type HighlightPart = { text: string; hit: boolean };

/** 본문을 검색어 기준으로 조각낸다. 대소문자 무시, 원문 표기 보존. */
export function splitByQuery(body: string, rawQuery: string): HighlightPart[] {
  const query = rawQuery.trim();
  if (body === "") return [];
  if (query === "") return [{ text: body, hit: false }];

  const lowerBody = body.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: HighlightPart[] = [];
  let pos = 0;

  while (pos < body.length) {
    const found = lowerBody.indexOf(lowerQuery, pos);
    if (found === -1) {
      parts.push({ text: body.slice(pos), hit: false });
      break;
    }
    if (found > pos) parts.push({ text: body.slice(pos, found), hit: false });
    parts.push({ text: body.slice(found, found + query.length), hit: true });
    pos = found + query.length;
  }

  return parts;
}
