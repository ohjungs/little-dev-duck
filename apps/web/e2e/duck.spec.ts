import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Duck 위젯도 로그인 뒤에 있다 - widgets.spec.ts와 동일한 세션 스킵 가드.
const AUTH_STATE_PATH =
  process.env.E2E_AUTH_STATE ?? path.join(__dirname, ".auth/user.json");
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("오리 마스코트 (Phase 3 플레이스홀더)", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test("홈 화면에 오리 캔버스가 렌더링되고 클릭하면 말풍선이 뜬다", async ({
    page,
  }) => {
    await page.goto("/");
    const duckWidget = page.getByTestId("duck-widget");
    await expect(duckWidget).toBeVisible();
    await expect(duckWidget.locator("canvas")).toBeVisible();

    // r3f는 캔버스에 직접 그리므로 DOM 엘리먼트가 아니라 캔버스 중앙을 클릭한다.
    // 첫 클릭은 항상 CLICK_PHRASES[0]("꽥!")이어야 한다 - 겹친 메시로 인한 중복 클릭이나
    // clickCount 렌더링 타이밍 버그가 생기면 이 정확한 문구 검증이 깨진다.
    await duckWidget.locator("canvas").click({ position: { x: 150, y: 110 } });
    await expect(duckWidget.getByText("꽥!")).toBeVisible();
  });
});
