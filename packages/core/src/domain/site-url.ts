// 사이트 절대 URL 결정. 순수함수 — process.env 접근은 호출부(Next layout)가 담당한다.

// 2026-07-26 : 공개공유 - 메타데이터 - 절대URL
// og:image/canonical은 절대 URL이어야 소셜 크롤러가 읽는다. Next의 metadataBase 기본값은
// 빌드 시점 localhost라, 정적 프리렌더 페이지(/welcome)에 localhost가 그대로 박혀 나간다(실측).
// VERCEL_URL은 배포마다 달라지는 프리뷰 주소라, 안정적인 프로덕션 도메인을 먼저 본다.

const LOCAL_FALLBACK = "http://localhost:5000";

export type SiteUrlEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
};

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolveSiteUrl(env: SiteUrlEnv): string {
  const raw =
    clean(env.NEXT_PUBLIC_SITE_URL) ??
    clean(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    clean(env.VERCEL_URL) ??
    LOCAL_FALLBACK;
  // Vercel이 주는 값은 스킴 없는 호스트(example.vercel.app)다.
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}
