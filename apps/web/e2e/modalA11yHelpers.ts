import { expect, type Locator, type Page } from "@playwright/test";

// 2026-08-03 : e2e - 모달 접근성 - 공유 검사 (useModalA11y 5개 모달 적용, 설계 계약 후속)
// CommandPalette.test.tsx·OfficeManagementPanel.test.tsx·OfficeTalkPanel.test.tsx·
// PresentationMode.test.tsx 머리말이 전부 "Tab 순환은 jsdom offsetParent 한계로 여기서
// 못 잰다 — Playwright e2e 몫"이라고 명시해 둔 지점을 이 파일 하나로 잠근다(command-palette.spec.ts·
// office-a11y.spec.ts·presentation.spec.ts가 공유). AUTH_STATE처럼 같은 검사를 스펙마다
// 복붙하면 한쪽만 고쳐지고 다른 쪽은 옛 규칙으로 남는다.

/**
 * useModalA11y.ts의 FOCUSABLE 상수와 반드시 같은 값이어야 한다 — 어긋나면 이 파일이 재는
 * "포커서블"과 훅이 실제로 트랩하는 "포커서블"이 달라져 거짓 통과/거짓 실패가 난다.
 */
export const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Tab 트랩 — 마지막 포커서블에서 Tab하면 첫 요소로, 첫 요소에서 Shift+Tab하면 마지막으로
 * 순환하는지 잰다. jsdom(offsetParent 항상 null)에서는 검증할 수 없는 유일한 지점이라
 * unit 테스트 전부가 이 검사를 e2e로 미뤄 뒀다 — WCAG 2.1 SC 2.1.2(No Keyboard Trap) 최소 기준.
 */
export async function expectTabTrap(dialog: Locator, page: Page): Promise<void> {
  const items = dialog.locator(FOCUSABLE);
  const first = items.first();
  const last = items.last();

  await last.focus();
  await page.keyboard.press("Tab");
  await expect(first, "마지막 포커서블에서 Tab했는데 첫 요소로 돌아오지 않았다").toBeFocused();

  await first.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(last, "첫 포커서블에서 Shift+Tab했는데 마지막 요소로 가지 않았다").toBeFocused();
}

/**
 * WCAG 2.2 SC 2.4.11(Focus Not Obscured, AA) — 현재 포커스된 요소의 중심점을 실제로
 * 히트테스트(elementFromPoint)해서, 그 지점에서 가장 위에 그려진 요소가 포커스된 요소
 * 자신(또는 그 조상/후손)인지 확인한다. 소스의 z-index 값을 읽는 정적 검사로는 컴파일된
 * CSS·스태킹 컨텍스트까지 반영된 실제 결과를 보증하지 못한다 — 실브라우저에서만 잴 수 있다.
 */
export async function expectFocusNotObscured(page: Page): Promise<void> {
  const obscured = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return true;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    if (!top) return true;
    return !(top === el || el.contains(top) || top.contains(el));
  });
  expect(
    obscured,
    "포커스된 요소가 다른 요소(예: sticky HUD)에 가려져 있다(WCAG 2.4.11)",
  ).toBe(false);
}
