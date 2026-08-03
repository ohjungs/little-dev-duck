import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./authState";
import { expectFocusNotObscured, expectTabTrap } from "./modalA11yHelpers";

// 2026-08-03 : e2e - CommandPalette - useModalA11y 배선 검증 (설계 계약 2026-08-03 후속)
// CommandPalette.test.tsx(vitest/jsdom)가 이미 role/aria·자동포커스·Esc-닫힘·다른 키(ArrowDown)
// 무간섭·재오픈 리스너 누적 없음까지 잠갔다. 여기서는 jsdom이 못 보는 것만 잰다: 트리거로의
// 포커스 실복원, Tab 트랩, 실브라우저 Focus-Not-Obscured.

test.describe("CommandPalette — 접근성 배선", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("Ctrl+K로 열리고 role=dialog·aria-modal을 갖추며, Esc로 닫으면 트리거로 포커스가 되돌아온다", async ({
    page,
  }) => {
    await page.goto("/pages");
    // "복원됐다"고 말하려면 시작점이 있어야 한다 — 트리거를 명시적으로 먼저 포커스한다.
    const trigger = page.getByRole("button", { name: "새 페이지", exact: true });
    await trigger.focus();
    await expect(trigger).toBeFocused();

    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "검색 및 명령" });
    await expect(dialog).toBeVisible();
    expect(await dialog.getAttribute("aria-modal")).toBe("true");
    await expectFocusNotObscured(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      trigger,
      "팔레트를 닫았는데 포커스가 연 지점(새 페이지 버튼)으로 돌아오지 않았다",
    ).toBeFocused();
  });

  test("Tab 트랩 — 마지막 항목에서 Tab하면 첫 항목으로, 첫 항목에서 Shift+Tab하면 마지막으로 순환한다", async ({
    page,
  }) => {
    await page.goto("/pages");
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "검색 및 명령" });
    await expect(dialog).toBeVisible();

    await expectTabTrap(dialog, page);
  });
});
