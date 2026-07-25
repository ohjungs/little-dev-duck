import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@ldd/core";

// 2026-07-26 : 발견성 - 크롤러 - 기본차단
// allow 목록에 없는 건 전부 막는다(deny-by-default). 사적인 경로를 하나씩 disallow에 적는 방식은
// 새 라우트가 생길 때마다 여기 추가하는 걸 잊으면 워크스페이스가 색인되는 쪽으로 새기 때문이다.
// 안전한 방향으로 틀리게 만든다 — 새 라우트는 기본이 비공개, 공개하려면 명시적으로 연다.
// 공개 표면은 proxy.ts의 PUBLIC_PATHS 중 "크롤러가 봐도 되는 것"만 골랐다:
//   /login·/auth/callback = 인증 화면(색인 무의미), /walker = 데스크톱 오버레이, /api/keepalive = cron용.

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });
  return {
    rules: {
      userAgent: "*",
      allow: ["/welcome", "/p/", "/opengraph-image"],
      disallow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
