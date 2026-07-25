import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// 로그인 없이 볼 수 있는 화면의 실제 스크린샷 + 콘솔/네트워크 오류 수집.
// 대시보드 위젯은 OAuth 뒤라 여기서 못 찍는다(e2e/README.md의 세션 파일이 있어야 한다) —
// **못 찍는 걸 찍은 척하지 않는다.** 공개 표면만 덮는다.
//
// `/_vercel/*`(Analytics·Speed Insights)은 Vercel 인프라만 서빙하므로 로컬 dev 서버에선
// 항상 404다 — 로컬 결함이 아니라 제외한다. 다만 그 404가 남기는 콘솔 오류에는 URL이 없어
// 문구만으로는 진짜 404와 구별할 수 없다. 그래서 실제로 관측된 `/_vercel/*` 404 **건수만큼만**
// 404 콘솔 메시지를 빼고 나머지는 그대로 실패시킨다(진짜 404를 조용히 삼키지 않기 위해).
// 프로덕션은 이 스펙이 못 덮는다 — 2026-07-26 확인 결과 Web Analytics가 꺼져 있어
// 프로덕션에서도 이 스크립트가 404다. docs/loop-eng/PENDING.md 참조.
const OUT = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "docs",
  "loop-eng",
  "screenshots",
  "2026-07-26",
  "public-surfaces",
);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const PAGES = [
  { name: "welcome", path: "/welcome" },
  { name: "login", path: "/login" },
];

test.beforeAll(() => {
  mkdirSync(OUT, { recursive: true });
});

for (const vp of VIEWPORTS) {
  for (const p of PAGES) {
    test(`${p.name} ${vp.name} — 스크린샷 + 콘솔 오류 없음`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedResponses: string[] = [];
      let vercelInfra404 = 0;

      page.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(m.text());
      });
      page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
      // 콘솔 메시지엔 URL이 없어서 어떤 리소스가 죽었는지 알 수 없다 — 응답에서 직접 잡는다.
      page.on("response", (r) => {
        if (r.status() < 400) return;
        if (r.url().includes("/_vercel/")) vercelInfra404 += 1;
        else failedResponses.push(`${r.status()} ${r.url()}`);
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(p.path, { waitUntil: "networkidle" });
      await page.screenshot({
        path: path.join(OUT, `${p.name}__default__${vp.name}.png`),
        fullPage: true,
      });

      // 관측된 인프라 404 건수만큼만 404 콘솔 메시지를 제외한다.
      let budget = vercelInfra404;
      const realConsoleErrors = consoleErrors.filter((t) => {
        if (budget > 0 && t.includes("404")) {
          budget -= 1;
          return false;
        }
        return true;
      });

      // 가로 스크롤이 생기면 레이아웃이 깨진 것이다.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(overflow, "가로 overflow").toBe(false);

      // root layout의 title.template("%s — Little Dev Duck")이 브랜드를 자동으로 붙이므로
      // 페이지가 title에 브랜드를 또 넣으면 두 번 나온다. 소스를 파싱하지 않고 **브라우저가
      // 실제로 받는 값**으로 검사한다 — 2026-07-26 프로덕션에서 랜딩이 이 상태였다.
      const title = await page.title();
      const brandCount = title.split("Little Dev Duck").length - 1;
      expect(brandCount, `제목에 브랜드 중복: ${title}`).toBe(1);
      // 실패 응답을 먼저 본다 — 콘솔 메시지엔 URL이 없어 이쪽이 진단에 쓸모 있다.
      expect(failedResponses, "실패한 요청").toEqual([]);
      expect(realConsoleErrors, "콘솔 오류").toEqual([]);
    });
  }
}

// 2026-07-26 : 공개정적자원 - 미들웨어차단 (세 번째 재발)
// 모든 페이지가 <link rel="manifest" href="/manifest.json">을 선언하는데, 미들웨어의 공개 경로
// 목록에 없어 **인증 게이트가 303으로 돌려보내 매니페스트가 아예 안 읽혔다**(프로덕션 실측).
// 앱 이름·아이콘·설치 프롬프트가 전부 무효가 된다.
//
// 같은 사고가 이미 두 번 있었다(OG 이미지, robots·sitemap — proxy.ts 주석에 기록돼 있다).
// 리다이렉트는 4xx가 아니라서 "실패한 요청" 수집에도 안 걸린다 — 그래서 별도로 못박는다.
test("HTML이 선언한 정적 자원이 인증 없이 실제로 받아진다", async ({ request }) => {
  // 브라우저가 아니라 요청 단위로 본다(리다이렉트를 따라가면 200처럼 보이므로 추적을 끈다).
  const res = await request.get("/manifest.json", { maxRedirects: 0 });
  expect(res.status(), "매니페스트가 리다이렉트되면 앱 설치 정보가 통째로 무효다").toBe(200);
  const body = await res.json();
  expect(body.name ?? body.short_name, "매니페스트에 앱 이름이 있어야 한다").toBeTruthy();
});

// 같은 사고가 세 번 났다: OG 이미지, robots·sitemap, 그리고 매니페스트. 매번 "이 경로도
// 공개로 열어야 했다"였고, 매번 프로덕션에서 발견했다. 개별 경로를 하나씩 못박는 대신
// **HTML이 실제로 참조하는 자원 전부**를 확인한다 — 앞으로 무엇을 추가하든 자동으로 덮인다.
test("공개 페이지가 참조하는 자원이 전부 인증 없이 받아진다", async ({ page, request }) => {
  await page.goto("/welcome", { waitUntil: "domcontentloaded" });
  const refs = await page.evaluate(() => {
    const raw = [
      ...Array.from(document.querySelectorAll("link[href], script[src], img[src]")).map(
        (el) => el.getAttribute("href") ?? el.getAttribute("src") ?? "",
      ),
      // og:image·twitter:image는 <meta>라 위 선택자에 안 걸린다. **이 부류의 첫 사고가
      // 바로 OG 이미지였는데**(공유 카드가 통째로 안 뜸) 가드가 그걸 못 덮고 있었다.
      ...Array.from(
        document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]'),
      ).map((el) => el.getAttribute("content") ?? ""),
    ];
    // 메타데이터의 절대 URL은 metadataBase 기준이라 테스트 서버와 포트가 다르다
    // (실측: localhost:3000). 호스트가 localhost면 경로만 떼어 이 서버에 물어본다.
    // 진짜 외부 호스트(CDN 등)는 이 검사 대상이 아니다.
    return raw
      .map((u) => {
        if (u.startsWith("/")) return u;
        try {
          const parsed = new URL(u);
          return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"
            ? parsed.pathname + parsed.search
            : "";
        } catch {
          return ""; // data: URI 등
        }
      })
      .filter((u) => u.startsWith("/"));
  });
  expect(refs.length, "참조가 하나도 안 잡히면 검사가 헛돈 것이다").toBeGreaterThan(0);

  const blocked: string[] = [];
  for (const url of [...new Set(refs)]) {
    // Vercel 인프라 경로는 로컬에서 서빙되지 않는다(별도 사유, 위 주석 참조).
    if (url.includes("/_vercel/")) continue;
    // 리다이렉트를 따라가면 200처럼 보이므로 추적을 끈다 — 매니페스트 사고가 그렇게 숨었다.
    const res = await request.get(url, { maxRedirects: 0 });
    if (res.status() !== 200) blocked.push(`${res.status()} ${url}`);
  }
  expect(blocked, "인증 게이트나 404에 막힌 자원").toEqual([]);
});
