import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// 위젯은 로그인(OAuth) 뒤에 있다. Google/GitHub 로그인을 Playwright로 직접 통과할 수
// 없으므로, 미리 저장해 둔 세션(storageState)이 있을 때만 이 스펙을 실행한다.
// 세션 생성 방법: e2e/README.md 참고.
const AUTH_STATE_PATH =
  process.env.E2E_AUTH_STATE ?? path.join(__dirname, ".auth/user.json");
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("투두/메모 위젯 CRUD", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test("투두를 추가하고 수정하고 완료 토글 후 삭제한다", async ({ page }) => {
    await page.goto("/");
    const widget = page.getByTestId("todo-widget");
    const title = `e2e-todo-${Date.now()}`;
    const editedTitle = `${title}-edited`;

    await widget.getByPlaceholder("할 일 추가").fill(title);
    await widget.getByRole("button", { name: "추가" }).click();

    // 방금 만든 항목의 data-testid(todo-<id>)를 title로 찾아 고정 핸들로 확보한다.
    // 편집 모드에서는 <span>{title}</span>이 <input>으로 바뀌어 hasText 매칭이 끊기므로,
    // li 자체의 testid로 잡아야 편집 중에도 같은 항목을 계속 가리킬 수 있다.
    const row = widget.locator("li", { hasText: title });
    await expect(row).toBeVisible();
    const testId = await row.getAttribute("data-testid");
    const item = widget.getByTestId(testId!);

    await item.getByRole("button", { name: "수정" }).click();
    await item.locator("input").fill(editedTitle);
    await item.getByRole("button", { name: "저장" }).click();
    await expect(item).toContainText(editedTitle);

    await item.locator('input[type="checkbox"]').check();
    await expect(item.locator('input[type="checkbox"]')).toBeChecked();

    await item.getByRole("button", { name: "삭제" }).click();
    await expect(widget.getByTestId(testId!)).toHaveCount(0);
  });

  test("메모를 추가하고 수정한 뒤 삭제한다", async ({ page }) => {
    await page.goto("/");
    const widget = page.getByTestId("memo-widget");
    const content = `e2e-memo-${Date.now()}`;
    const editedContent = `${content}-edited`;

    await widget.getByPlaceholder("메모 (Ctrl+Enter로 추가)").fill(content);
    await widget.getByRole("button", { name: "추가" }).click();

    const note = widget.locator("div", { hasText: content }).last();
    await expect(note).toBeVisible();
    const testId = await note.getAttribute("data-testid");
    const stableNote = widget.getByTestId(testId!);

    await stableNote.getByRole("button", { name: "수정" }).click();
    await stableNote.locator("textarea").fill(editedContent);
    await stableNote.getByRole("button", { name: "저장" }).click();
    await expect(stableNote).toContainText(editedContent);

    await stableNote.getByRole("button", { name: "삭제" }).click();
    await expect(widget.getByTestId(testId!)).toHaveCount(0);
  });
});
