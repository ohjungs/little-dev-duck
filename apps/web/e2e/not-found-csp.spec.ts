import path from "node:path";
import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./authState";

// 2026-07-26 : 보안 - CSP - 404페이지 정적프리렌더 (Phase 38)
// `lessons-learned.md`의 **재발견 1회짜리** 교훈: "nonce 기반 CSP는 정적 프리렌더링 페이지에서
// 무효" — 빌드 때 구운 스크립트가 매 요청의 nonce와 영영 불일치해 `strict-dynamic` 아래서
// 전부 막힌다. 그때는 `/login`이 정적이라 **로그인이 완전 불능**이었고 실사용자가 발견해 줬다.
//
// 빌드 결과에서 `/_not-found`가 여전히 정적(`○`)이라 `force-dynamic`으로 고쳤고,
// **빌드 출력이 `ƒ`로 바뀌는 것까지 확인했다.** 회귀는 `buildStaticGuard.ts`가 매 e2e마다 막는다.
//
// **이 스펙은 로그인이 필요하다(실행 못 했다).** 비로그인 상태로 없는 주소를 열면 미들웨어가
// `/welcome`으로 303을 보내 404 화면에 닿지 못한다(실측). 즉 이 화면은 **로그인한 사용자가
// 없는 주소를 열었을 때만** 보인다 — 삭제된 페이지 링크·오타 같은 경우다.
//
// 교훈이 못박은 검증 방법 그대로다: **"curl의 응답 헤더 값만으로는 이 버그를 못 잡는다"** —
// nonce가 매번 달라지는 것 자체는 정상으로 보인다. 실제 브라우저 콘솔을 봐야 한다.

const OUT = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "docs",
  "loop-eng",
  "screenshots",
  "2026-07-26",
  "not-found",
);

test.describe("404 페이지 (로그인 필요 — 비로그인은 /welcome으로 돌려보내진다)", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("스크립트가 CSP에 막히지 않는다", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

    const res = await page.goto("/이-주소는-없습니다", {
      waitUntil: "networkidle",
    });
    // 404 자체는 정상이다 — 없는 주소니까. 여기서 303이면 세션이 만료된 것이다.
    expect(res?.status()).toBe(404);

    await page.screenshot({
      path: path.join(OUT, "not-found__default__desktop.png"),
      fullPage: true,
    });

    // CSP 위반은 콘솔에만 뜬다(문서 요청 자체는 정상으로 보인다). 그래서 콘솔을 본다.
    const csp = consoleErrors.filter((t) =>
      /Content Security Policy|CSP|Refused to execute|Refused to load/i.test(t),
    );
    expect(csp, `CSP 위반:\n${csp.join("\n")}`).toEqual([]);
  });

  test("안내 문구와 돌아갈 링크가 보인다", async ({ page }) => {
    // 스크립트가 막혀도 서버 HTML은 그려지므로 이 검사만으로는 위 버그를 못 잡는다.
    // 그래도 404가 빈 화면이 아니라는 건 따로 지켜야 한다.
    await page.goto("/이-주소는-없습니다");
    await expect(
      page.getByRole("heading", { name: "이 페이지를 찾을 수 없어요" }),
    ).toBeVisible();
    await expect(page.getByRole("link").first()).toBeVisible();
  });
});
