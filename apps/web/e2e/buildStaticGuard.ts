import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// 2026-07-26 : 보안 - CSP - 정적페이지 회귀차단 (Phase 38)
// `lessons-learned.md`의 "nonce 기반 CSP는 정적 프리렌더링 페이지에서 무효"는 **재발견 1회**짜리다.
// 처음엔 `/login`이 정적이라 **로그인이 완전 불능**이었고 실사용자가 발견해 줬다.
// 이번엔 `/_not-found`가 정적이었다 — 같은 함정을 **두 번째로** 밟았다.
//
// 교훈은 "force-dynamic을 붙여라"였는데, **붙였는지 확인하는 장치가 없었다.**
// 이 저장소의 원칙 그대로다: 규칙을 주석으로만 두면 다음 사람이 어긴다 → **검사로 만든다.**
//
// 빌드 산출물(`.next/app-path-routes-manifest.json`이 아니라 prerender manifest)에서
// **정적으로 구워진 HTML 페이지**를 찾아, 허용 목록 밖이면 실패시킨다.
//
// 한계(정직하게): 빌드 산출물 검사라 빌드를 안 하면 못 잡는다. e2e globalSetup에서 부르므로
// `pnpm e2e`(next build && playwright test) 경로에서는 항상 돈다.

// 스크립트가 없어 nonce와 무관한 것들. 이미지·텍스트 응답이라 정적이 오히려 맞다.
const ALLOWED_STATIC = new Set([
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/manifest.json",
  // **고칠 수 없어서 넣는다(정직하게).** Next.js 내장 전역 오류 페이지라 우리 코드가 아니고,
  // 커스텀 `global-error.tsx`는 "use client"여야 해서 `export const dynamic`을 받지 못한다.
  // 결과: 루트 레이아웃이 통째로 터진 극단적 상황에서 이 화면의 스크립트가 CSP에 막힌다
  // (문구는 보이고 "다시 시도" 버튼이 안 눌린다). 그 상황 자체가 이미 고장이라 감수한다.
  "/_global-error",
]);

export function findUnsafeStaticPages(nextDir: string): string[] {
  const manifestPath = path.join(nextDir, "prerender-manifest.json");
  if (!existsSync(manifestPath)) return [];

  const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    routes?: Record<string, { dataRoute?: string | null }>;
  };
  const routes = Object.keys(raw.routes ?? {});

  return routes
    .filter((r) => !ALLOWED_STATIC.has(r))
    // 텍스트·이미지 응답은 확장자로 걸러낸다(스크립트가 없다).
    .filter((r) => !/\.(txt|xml|ico|png|jpg|jpeg|webp|svg|json)$/.test(r))
    .sort();
}

export function assertNoUnsafeStaticPages(nextDir: string): void {
  const unsafe = findUnsafeStaticPages(nextDir);
  if (unsafe.length === 0) return;
  throw new Error(
    [
      "정적으로 프리렌더된 HTML 페이지가 있습니다:",
      ...unsafe.map((r) => `  - ${r}`),
      "",
      "nonce 기반 CSP(script-src 'nonce-…' 'strict-dynamic') 아래서는 빌드 때 구운 스크립트가",
      "매 요청의 nonce와 불일치해 **전부 차단**됩니다(lessons-learned: /login 로그인 불능 사례).",
      '해당 페이지에 `export const dynamic = "force-dynamic"`을 추가하세요.',
      "스크립트가 없는 응답(이미지·텍스트)이라면 buildStaticGuard.ts의 허용 목록에 넣으세요.",
    ].join("\n"),
  );
}
