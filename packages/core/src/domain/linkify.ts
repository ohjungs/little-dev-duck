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

// 2026-07-29 : 메신저 - 노트 링크 감지 (Phase 59 T1 S-006)
// 메시지에 붙여넣은 내 페이지 URL을 감지해 화면이 제목으로 바꿔 그릴 수 있게 한다.
// **감지는 linkifyParts 한 벌 위에서만** — 말풍선에서 링크가 되는 것과 노트로 인식되는
// 것이 갈라지면 어느 쪽이 고장인지 모른다(K-016 링크 모아보기와 같은 원칙).
// 호스트는 보지 않는다: 배포 도메인이 바뀌어도 동작해야 하고, 남의 사이트 /pages/ URL이
// 걸려도 제목 조회(getPage)가 null이라 평문 링크로 남을 뿐 해가 없다.

// core는 DOM 전역(URL)이 없는 환경이라 정규식으로 판정한다: 경로가 정확히
// /pages/<uuid>로 끝나야 하고(뒤가 ?·#·끝), /pages/<uuid>/edit 같은 하위 경로는 아니다.
const PAGE_HREF_RE =
  /^https?:\/\/[^/]+\/pages\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[?#]|$)/i;

export function pageIdFromHref(href: string): string | null {
  const m = PAGE_HREF_RE.exec(href);
  return m ? m[1]! : null;
}

/** 본문 속 내부 페이지 id를 중복 없이. 조회(제목)는 호출부가 한다 — 여기는 순수 판정만. */
export function collectPageIds(body: string): string[] {
  const ids = new Set<string>();
  for (const part of linkifyParts(body)) {
    if (part.href) {
      const id = pageIdFromHref(part.href);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}
