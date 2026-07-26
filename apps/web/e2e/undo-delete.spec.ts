import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./authState";

// 삭제 되돌리기(Phase 21)는 로그인 뒤 대시보드 위젯이라 저장된 세션이 있어야 돈다.
// 세션 생성 방법은 e2e/README.md 참고. 없으면 스킵된다(실패 아님).

test.describe("삭제 되돌리기 (Phase 21)", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("지운 할 일을 되돌리면 같은 항목이 돌아온다", async ({ page }) => {
    await page.goto("/");
    const widget = page.getByTestId("todo-widget");
    const title = `e2e-undo-${Date.now()}`;

    await widget.getByPlaceholder("할 일 추가").fill(title);
    await widget.getByRole("button", { name: "추가" }).click();

    const row = widget.locator("li", { hasText: title });
    await expect(row).toBeVisible();
    const testId = await row.getAttribute("data-testid");

    await widget
      .getByTestId(testId!)
      .getByRole("button", { name: "삭제" })
      .click();
    await expect(widget.getByTestId(testId!)).toHaveCount(0);

    const notice = widget.getByTestId("undo-notice");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText(title);

    await notice.getByRole("button", { name: "되돌리기" }).click();

    // 같은 id(data-testid)로 돌아와야 한다 — 새 id면 순서·임베딩이 끊긴 것이다.
    await expect(widget.getByTestId(testId!)).toBeVisible();
    await expect(widget.getByTestId(testId!)).toContainText(title);
    await expect(notice).toHaveCount(0);

    // 뒷정리
    await widget
      .getByTestId(testId!)
      .getByRole("button", { name: "삭제" })
      .click();
    await expect(widget.getByTestId(testId!)).toHaveCount(0);
  });

  test("되돌리기 안내는 스크린리더가 읽는 상태 영역이다", async ({ page }) => {
    await page.goto("/");
    const widget = page.getByTestId("todo-widget");
    const title = `e2e-undo-a11y-${Date.now()}`;

    await widget.getByPlaceholder("할 일 추가").fill(title);
    await widget.getByRole("button", { name: "추가" }).click();
    const row = widget.locator("li", { hasText: title });
    const testId = await row.getAttribute("data-testid");
    await widget
      .getByTestId(testId!)
      .getByRole("button", { name: "삭제" })
      .click();

    await expect(widget.getByRole("status")).toContainText("되돌리기");
  });

  test("연달아 지우면 안내가 최신 항목으로 바뀐다", async ({ page }) => {
    await page.goto("/");
    const widget = page.getByTestId("todo-widget");
    const first = `e2e-undo-a-${Date.now()}`;
    const second = `e2e-undo-b-${Date.now()}`;

    for (const title of [first, second]) {
      await widget.getByPlaceholder("할 일 추가").fill(title);
      await widget.getByRole("button", { name: "추가" }).click();
      await expect(widget.locator("li", { hasText: title })).toBeVisible();
    }

    for (const title of [first, second]) {
      const id = await widget
        .locator("li", { hasText: title })
        .getAttribute("data-testid");
      await widget
        .getByTestId(id!)
        .getByRole("button", { name: "삭제" })
        .click();
      await expect(widget.getByTestId(id!)).toHaveCount(0);
    }

    // 안내는 하나만 남고, 마지막에 지운 것을 가리켜야 한다.
    const notice = widget.getByTestId("undo-notice");
    await expect(notice).toHaveCount(1);
    await expect(notice).toContainText(second);
  });

  test("지운 메모도 되돌릴 수 있다", async ({ page }) => {
    await page.goto("/");
    const widget = page.getByTestId("memo-widget");
    const content = `e2e-undo-memo-${Date.now()}`;

    await widget.getByPlaceholder("메모 (Ctrl+Enter로 추가)").fill(content);
    await widget.getByRole("button", { name: "추가" }).click();

    const note = widget.locator("div", { hasText: content }).last();
    await expect(note).toBeVisible();
    const testId = await note.getAttribute("data-testid");

    await widget
      .getByTestId(testId!)
      .getByRole("button", { name: "삭제" })
      .click();
    await expect(widget.getByTestId(testId!)).toHaveCount(0);

    await widget
      .getByTestId("undo-notice")
      .getByRole("button", { name: "되돌리기" })
      .click();
    await expect(widget.getByTestId(testId!)).toBeVisible();

    await widget
      .getByTestId(testId!)
      .getByRole("button", { name: "삭제" })
      .click();
  });
});
