import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// web/testing.md 규칙이 지정한 4개 breakpoint. 그 사이 크기는 CSS가 fluid하게
// 보간한다고 보고, 레이아웃 붕괴 여부는 이 4개 지점에서만 확인한다.
const VIEWPORTS = [
  { width: 320, height: 690 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
];

// document.body 기준 scrollWidth > clientWidth면 가로 스크롤/overflow가 생긴 것이다.
async function getBodyOverflow(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.body.scrollWidth,
    clientWidth: document.body.clientWidth,
  }));
}

test.describe("로그인 페이지 반응형 (인증 불필요)", () => {
  for (const { width, height } of VIEWPORTS) {
    test(`뷰포트 ${width}x${height}: 가로 스크롤/overflow가 없다`, async ({
      page,
    }) => {
      // 리사이즈 후 goto해야 초기 렌더가 해당 뷰포트 기준으로 이뤄진다.
      await page.setViewportSize({ width, height });
      await page.goto("/login");

      const overflow = await getBodyOverflow(page);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    });

    test(`뷰포트 ${width}x${height}: Google/GitHub 로그인 버튼이 보이고 클릭 가능한 크기다`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/login");

      const googleButton = page.getByRole("button", {
        name: "Google로 계속하기",
      });
      const githubButton = page.getByRole("button", {
        name: "GitHub로 계속하기",
      });
      await expect(googleButton).toBeVisible();
      await expect(githubButton).toBeVisible();

      // boundingBox가 null이거나 폭/높이가 0이면 화면엔 있어도 실제로는 클릭할 수
      // 없는 상태(찌그러짐, 잘림)이므로 그 경우만 걸러낸다.
      const googleBox = await googleButton.boundingBox();
      const githubBox = await githubButton.boundingBox();
      expect(googleBox?.width).toBeGreaterThan(0);
      expect(googleBox?.height).toBeGreaterThan(0);
      expect(githubBox?.width).toBeGreaterThan(0);
      expect(githubBox?.height).toBeGreaterThan(0);
    });
  }
});

// 홈 화면 위젯은 로그인 뒤에 있다. widgets.spec.ts와 동일한 세션 스킵 가드.
const AUTH_STATE_PATH =
  process.env.E2E_AUTH_STATE ?? path.join(__dirname, ".auth/user.json");
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("홈 화면 반응형 (인증 필요)", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  for (const { width, height } of VIEWPORTS) {
    // 무겁게 만들지 않기 위해 뷰포트당 overflow와 핵심 위젯(투두/메모/오리/GitHub)
    // 가시성만 가볍게 확인한다 - 겹침 여부 스냅샷 비교 등은 하지 않는다.
    test(`뷰포트 ${width}x${height}: overflow 없이 투두/메모/오리/GitHub 위젯이 보인다`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");

      const overflow = await getBodyOverflow(page);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);

      await expect(page.getByTestId("todo-widget")).toBeVisible();
      await expect(page.getByTestId("memo-widget")).toBeVisible();
      await expect(page.getByTestId("duck-widget")).toBeVisible();
      await expect(
        page.getByTestId("github-contribution-widget"),
      ).toBeVisible();
    });
  }
});
