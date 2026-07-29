// 2026-07-29 : 메신저 - 코드 블록 분리 (Phase 54 T3 H-013)
//
// ``` 펜스만 다룬다 — 마크다운 파서를 만드는 것이 아니다(재구현 금지 항목).
// BlockNote는 페이지 에디터라 말풍선 read-only 렌더에 부적합하다(메시지마다 에디터
// 인스턴스를 띄우면 성능이 무너진다). 펜스 분리는 linkify와 같은 결정적 가공이다.
//
// 코드 조각은 **그대로 보존**한다 — 안의 URL을 링크로 만들거나 하지 않는다.
// 화면은 text 조각만 linkify하고 code 조각은 <pre>로 그린다.

export type CodeFencePart =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string; lang: string | null };

export function codeFenceParts(body: string): CodeFencePart[] {
  if (body === "") return [];
  const parts: CodeFencePart[] = [];
  // ```lang\n...\n``` — 닫힘이 없으면 끝까지 코드(마크다운 관례. 자르다 만 것보다 낫다).
  const fence = /```([A-Za-z0-9+#-]*)\n([\s\S]*?)(?:\n?```|$)/g;
  let pos = 0;

  for (const match of body.matchAll(fence)) {
    const [raw, lang, code] = match;
    if (match.index > pos) parts.push({ kind: "text", text: body.slice(pos, match.index) });
    const trimmed = (code ?? "").replace(/\n$/, "");
    // 빈 블록은 조각을 만들지 않는다 — 복사할 것이 없다.
    if (trimmed !== "") parts.push({ kind: "code", text: trimmed, lang: lang || null });
    pos = match.index + raw.length;
  }

  if (pos < body.length) parts.push({ kind: "text", text: body.slice(pos) });
  return parts;
}
