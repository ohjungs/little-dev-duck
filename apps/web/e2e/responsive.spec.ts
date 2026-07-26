import { expect, test, type Page } from "@playwright/test";
import { AUTH_STATE } from "./authState";

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

// 홈 화면 위젯은 로그인 뒤에 있다. 세션 스킵 가드는 authState.ts 한 곳에 있다.

test.describe("홈 화면 반응형 (인증 필요)", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

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

// 2026-07-27 : 페이지 - 도구모음 - 넘침 (2차 피드백 2-1, Phase 42 T1)
// 도구 모음 버튼 9개가 `max-w-3xl`(768px) 한 줄에 들어가는데 `flex-wrap`이 없어 좁은 창에서
// 넘쳤다. `flex-wrap`으로 고쳤고, **그 자리에 검사가 없어서** 다시 넘쳐도 아무도 모른다.
//
// **이 검사는 지금 돌지 않는다** — 로그인 세션이 있어야 페이지 편집기에 닿는다(44건과 같은 처지,
// Phase 41 T5가 켜면 함께 돈다). 실행되지 않은 테스트는 문서라는 걸 이 저장소가 여러 번 적었다.
// 그래도 넣는 이유는 **켜지는 시점에 이 회귀가 자동으로 잡히게** 하기 위해서다.
test.describe("페이지 편집기 도구 모음 (인증 필요)", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  // 사용자가 지적한 조건이 "전체화면이 아닌 상태"다 — 넓은 창에서는 여백이 남아 안 보인다.
  for (const width of [1024, 1280]) {
    test(`뷰포트 ${width}: 도구 모음이 가로 넘침을 만들지 않는다`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/pages");
      // 트리의 페이지 링크로 연다. **testid를 새로 심지 않았다** — 없는 testid를 쓰면
      // 선택자가 영영 안 맞아 "살아 있는 척 죽은 테스트"가 된다(휴지통 링크는 뺀다).
      const firstPage = page
        .locator('a[href^="/pages/"]:not([href="/pages/trash"])')
        .first();
      // 페이지가 하나도 없을 수 있다 — 그때는 편집기가 없으므로 검사할 것도 없다.
      test.skip(
        (await firstPage.count()) === 0,
        "페이지가 없어 편집기를 열 수 없다",
      );
      await firstPage.click();
      await page.waitForURL(/\/pages\/[^/]+$/);

      const overflow = await getBodyOverflow(page);
      expect(
        overflow.scrollWidth,
        "도구 모음이 넘치면 문서 전체에 가로 스크롤이 생긴다",
      ).toBeLessThanOrEqual(overflow.clientWidth);
    });
  }
});
