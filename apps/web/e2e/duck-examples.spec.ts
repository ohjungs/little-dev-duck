import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./authState";

// 오리 대화창은 로그인 뒤 화면이라 저장된 세션이 있을 때만 돈다(e2e/README.md 참고).

test.describe("오리 대화 예시 칩 (2026-07-26)", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("예시를 누르면 입력창에 채워진다", async ({ page }) => {
    await page.goto("/");
    const chip = page.getByRole("button", { name: "장보기 추가" });
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(
      page.getByPlaceholder("오리에게 물어보거나 시키기"),
    ).toHaveValue("장보기 추가");
  });

  test("예시를 눌러도 바로 보내지 않는다 (의도 없는 쿼터 소모 금지)", async ({
    page,
  }) => {
    let agentCalls = 0;
    await page.route("**/api/ai/agent", async (route) => {
      agentCalls += 1;
      await route.abort();
    });
    await page.goto("/");
    await page.getByRole("button", { name: "운동 체크해" }).click();
    await page.waitForTimeout(500);
    expect(agentCalls).toBe(0);
  });

  test("대화가 시작되면 예시가 사라진다", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "장보기 추가" }),
    ).toBeVisible();
    await page.getByPlaceholder("오리에게 물어보거나 시키기").fill("안녕");
    await page.getByRole("button", { name: "보내기" }).click();
    await expect(page.getByRole("button", { name: "장보기 추가" })).toHaveCount(
      0,
    );
  });
});
