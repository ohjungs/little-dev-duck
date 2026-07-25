// 공개 페이지(/p/[slug])의 소셜 카드·문서 제목 문구 파생. 순수함수 — Metadata 객체 조립은 Next 라우트가 담당.

// 2026-07-25 : 공개공유 - 소셜카드 - 문구상한
// 카드 문구는 플랫폼이 잘라서 보여준다(X 제목 ~70자, 설명 ~200자). 잘리는 지점을 플랫폼에 맡기면
// 브랜드·맥락이 먼저 사라지므로 여기서 미리 자른다.
export const PUBLIC_PAGE_META_LIMITS = {
  title: 70,
  description: 200,
} as const;

const UNTITLED = "제목 없음";

// og:title에 개행이 들어가면 카드가 깨지는 플랫폼이 있어 공백류를 한 칸으로 접는다.
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// 코드포인트 단위로 자른다 — slice는 이모지(서로게이트 페어)를 반쪽으로 잘라 깨진 문자를 남긴다.
function truncate(text: string, max: number): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  return `${chars.slice(0, max - 1).join("")}…`;
}

export function publicPageMetaCopy(rawTitle: string): {
  title: string;
  description: string;
} {
  const title = truncate(
    oneLine(rawTitle) || UNTITLED,
    PUBLIC_PAGE_META_LIMITS.title,
  );
  return {
    title,
    description: truncate(
      `${title} — Little Dev Duck으로 공개한 페이지`,
      PUBLIC_PAGE_META_LIMITS.description,
    ),
  };
}
