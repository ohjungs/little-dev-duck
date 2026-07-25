import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@ldd/core";

// 2026-07-26 : 발견성 - 사이트맵 - 열거금지
// **공개 페이지(/p/<slug>)는 사이트맵에 싣지 않는다.** Phase 12 T1이 열거 방지를 위해 일부러
// security-definer RPC(get_public_page)로 "요청한 slug 한 건만" 반환하도록 설계했는데, 사이트맵에
// 전 slug를 나열하면 그 방어를 우리 손으로 무력화하는 꼴이다(공개 페이지 목록을 통째로 배포).
// 사용자는 링크를 골라서 공유한 것이지 자기 페이지 목록 공개에 동의한 게 아니다.
// 랜딩만 싣는다 — 개별 공개 페이지는 공유된 링크를 통해 도달·색인된다(robots에서 /p/ 허용).

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });
  return [
    {
      url: `${siteUrl}/welcome`,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
