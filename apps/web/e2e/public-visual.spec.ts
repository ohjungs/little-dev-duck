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
