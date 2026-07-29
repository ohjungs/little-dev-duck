// 2026-07-29 : 메신저 - 메시지 URL 링크화 (Phase 54)
//
// 본문 속 URL을 클릭할 수 있게 조각으로 나눈다. **미리보기 카드는 만들지 않는다** —
// 외부 fetch가 필요해 쿼터·SSRF 표면이 생긴다. 링크화는 fetch 0회의 결정적 가공이다.
//
// 보안: 이 경로로 **에이전트(LLM) 응답도 렌더된다.** `javascript:` 같은 스킴이 링크가 되면
// 그게 인젝션 표면이다 — 정규식이 http(s)만 잡게 스킴을 고정한다(허용 목록 방식).
// HTML 문자열은 만들지 않는다. 화면이 조각을 React 요소로 그린다(평문 렌더 원칙).

export type LinkPart = { text: string; href: string | null };

// URL에 올 수 있는 문자만 명시한다. `\S`로 잡으면 "https://a.com입니다"의 한글까지 삼킨다.
const URL_PATTERN = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g;

/** 끝에 붙은 문장 부호를 URL에서 떼어 낸다. 닫는 괄호는 안에서 짝이 맞으면 남긴다(위키 링크). */
function trimTrailing(url: string): string {
  let out = url;
  for (;;) {
    const last = out[out.length - 1];
    if (last === undefined) break;
    if (".,;:!?'\"".includes(last)) {
      out = out.slice(0, -1);
      continue;
    }
    if (last === ")" && (out.match(/\(/g)?.length ?? 0) < (out.match(/\)/g)?.length ?? 0)) {
      out = out.slice(0, -1);
      continue;
    }
    if (last === "]" && (out.match(/\[/g)?.length ?? 0) < (out.match(/\]/g)?.length ?? 0)) {
      out = out.slice(0, -1);
      continue;
    }
    break;
  }
  return out;
}

export function linkifyParts(body: string): LinkPart[] {
  if (body === "") return [];
  const parts: LinkPart[] = [];
  let pos = 0;

  for (const match of body.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const url = trimTrailing(raw);
    if (url === "") continue;
    const start = match.index;
    if (start > pos) parts.push({ text: body.slice(pos, start), href: null });
    parts.push({ text: url, href: url });
    pos = start + url.length;
  }

  if (pos < body.length) parts.push({ text: body.slice(pos), href: null });
  return parts;
}
