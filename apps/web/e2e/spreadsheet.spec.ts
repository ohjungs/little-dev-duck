import { expect, test, type Page as BrowserPage } from "@playwright/test";
import { AUTH_STATE } from "./authState";

// 2026-08-02 : e2e - 스프레드시트 - E1(수식이 산다)·E3(순환)·E6(키보드만으로)
// SPEC-2026-08-02-spreadsheet-a1 5절 시나리오. pages-workspace.spec.ts와 같은 관례를 따른다:
// AUTH_STATE 게이트, e2e- 접두사 제목(cleanup.ts가 최종 방어선), 저장 완료는 텍스트 폴링이
// 아니라 **실제 요청**을 기다린다(디바운스 800ms + 왕복이라 폴링은 실측에서 들쭉날쭉했다).

function waitForCellSave(page: BrowserPage) {
  return page.waitForResponse(
    (res) => res.url().includes("/rest/v1/sheet_cells") && res.ok(),
  );
}

/** 격자는 가상 스크롤이라 좌표로 찾는다(aria-rowindex/colindex는 머리글이 1이라 +2다). */
function cellAt(page: BrowserPage, r: number, c: number) {
  return page.locator(
    `[role="row"][aria-rowindex="${r + 2}"] [role="gridcell"][aria-colindex="${c + 2}"]`,
  );
}

/**
 * 선택 칸에는 **입력칸이 상주한다**(한글 IME가 조합을 걸 곳). 그래서 이미 선택된 칸을 클릭하면
 * 셀이 아니라 그 입력칸이 받는다 — 다른 칸은 셀을 클릭하고, 선택 칸은 입력칸을 클릭한다.
 */
async function focusCell(page: BrowserPage, r: number, c: number) {
  const selected = await cellAt(page, r, c).getAttribute("aria-selected");
  if (selected === "true") await page.getByLabel("셀 편집").click();
  else await cellAt(page, r, c).click();
}

async function createSheetPage(page: BrowserPage, title: string) {
  await page.goto("/pages");
  await page.getByRole("button", { name: "새 페이지 메뉴" }).click();
  await page.getByRole("button", { name: "빈 페이지" }).click();
  const titleInput = page.getByLabel("페이지 제목");
  await expect(titleInput).toBeVisible();
  await titleInput.fill(title);
  await page.getByRole("button", { name: "스프레드시트 추가" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
}

test.describe("스프레드시트 — 격자·수식·키보드", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("E1: 수식이 계산되고, 참조한 셀을 고치면 따라 바뀌고, 새로고침해도 남는다", async ({
    page,
  }) => {
    await createSheetPage(page, `e2e-sheet-${Date.now()}`);

    // A1=10, A2=20, A3=SUM(A1:A2). 확정(Enter)하면 아래 칸으로 내려가므로 이어서 친다.
    await focusCell(page, 0, 0);
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");
    await page.keyboard.type("20");
    await page.keyboard.press("Enter");
    await page.keyboard.type("=SUM(A1:A2)");
    const firstSave = waitForCellSave(page);
    await page.keyboard.press("Enter");

    await expect(cellAt(page, 2, 0)).toHaveText("30");
    await firstSave;

    // A1을 15로 고치면 A3이 35가 된다(재계산).
    await focusCell(page, 0, 0);
    await page.keyboard.type("15");
    const secondSave = waitForCellSave(page);
    await page.keyboard.press("Enter");
    await expect(cellAt(page, 2, 0)).toHaveText("35");
    await secondSave;

    // 새로고침해도 값과 수식이 남는다(계산 결과는 저장하지 않고 불러올 때 다시 센다).
    await page.reload();
    await expect(cellAt(page, 2, 0)).toHaveText("35");
    await focusCell(page, 2, 0);
    await expect(page.getByLabel("수식 입력줄")).toHaveValue("=SUM(A1:A2)");
  });

  test("E3: 순환 참조는 #CIRCULAR!로 보이고 화면이 멈추지 않는다", async ({ page }) => {
    await createSheetPage(page, `e2e-sheet-circ-${Date.now()}`);

    await focusCell(page, 0, 0);
    await page.keyboard.type("=A1");
    await page.keyboard.press("Enter");
    await expect(cellAt(page, 0, 0)).toHaveText("#CIRCULAR!");

    // 순환이 있어도 다른 셀은 계속 쓸 수 있다(표 전체가 죽지 않는다).
    await focusCell(page, 0, 1);
    await page.keyboard.type("7");
    await page.keyboard.press("Enter");
    await expect(cellAt(page, 0, 1)).toHaveText("7");
  });

  test("E6: 마우스 없이 이름 상자·방향키·F2·Esc로 이동하고 편집한다", async ({ page }) => {
    await createSheetPage(page, `e2e-sheet-kbd-${Date.now()}`);

    // 이름 상자로 B2에 간 뒤 격자로 포커스를 옮긴다.
    const nameBox = page.getByLabel("이름 상자");
    await nameBox.fill("B2");
    await nameBox.press("Enter");
    await expect(cellAt(page, 1, 1)).toHaveAttribute("aria-selected", "true");

    // 방향키로 한 칸 내려간 뒤 F2로 편집, Esc로 취소하면 값이 남지 않는다.
    await page.keyboard.press("ArrowDown");
    await expect(cellAt(page, 2, 1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("F2");
    await page.keyboard.type("취소될 값");
    await page.keyboard.press("Escape");
    await expect(cellAt(page, 2, 1)).toHaveText("");

    // 글자를 바로 치면 편집이 시작되고 Enter로 확정된다.
    await page.keyboard.type("42");
    const saved = waitForCellSave(page);
    await page.keyboard.press("Enter");
    await expect(cellAt(page, 2, 1)).toHaveText("42");
    await saved;
  });
});
