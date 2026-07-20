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

  test("연속 클릭 시 phrases 배열 순서대로 말풍선 문구가 바뀐다", async ({
    page,
  }) => {
    await page.goto("/");
    const duckWidget = page.getByTestId("duck-widget");
    const canvas = duckWidget.locator("canvas");
    await expect(canvas).toBeVisible();

    // packages/mascot/src/phrases.ts의 CLICK_PHRASES 순서 그대로다.
    // pickPhrase(clickCount)는 clickCount % length로 인덱스를 고정 계산하고,
    // Duck.tsx의 handleGreet은 클릭 시점의 clickCountRef.current로 문구를 먼저
    // 고정한 뒤 증가시키므로 페이지 새로고침 직후 첫 3회 클릭은 항상 이 순서다.
    const expectedSequence = ["꽥!", "오늘도 화이팅!", "할 일 하나 해볼까요?"];

    for (const expectedPhrase of expectedSequence) {
      await canvas.click({ position: { x: 150, y: 110 } });
      await expect(duckWidget.getByText(expectedPhrase)).toBeVisible();
    }
  });

  test("빠른 연속 클릭(더블클릭)에도 말풍선에 중복/깨진 텍스트가 뜨지 않는다", async ({
    page,
  }) => {
    // 커밋 3b34286에서 도입된 겹친 메시(몸통/머리/부리/안경 등) 레이캐스트는
    // stopPropagation 없이는 클릭 한 번에 onGreet이 여러 번 불려 문구가 여러 칸
    // 건너뛰는 회귀를 만들었다(Duck.tsx handleClick 주석 참고). 더블클릭으로 빠르게
    // 두 번 연속 클릭해도 정확히 2회분만 진행돼야 한다(꽥! -> 오늘도 화이팅!).
    // 회귀가 재발하면(예: stopPropagation 누락) 더 많은 칸을 건너뛰어 이 값이 어긋난다.
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    const duckWidget = page.getByTestId("duck-widget");
    const canvas = duckWidget.locator("canvas");
    await expect(canvas).toBeVisible();

    await canvas.dblclick({ position: { x: 150, y: 110 } });

    const bubble = duckWidget.getByText("오늘도 화이팅!");
    await expect(bubble).toBeVisible();
    // 말풍선 DOM이 중복 렌더링되어 같은 문구가 여러 개 뜨지 않는지 확인한다.
    await expect(bubble).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
  });
});
