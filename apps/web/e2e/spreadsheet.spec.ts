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

  test("E2: 복사한 수식을 옆 칸에 붙이면 상대참조가 따라간다", async ({ page }) => {
    await createSheetPage(page, `e2e-sheet-ref-${Date.now()}`);

    await focusCell(page, 0, 0);
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");
    await page.keyboard.type("20");
    await page.keyboard.press("Enter");
    await page.keyboard.type("=SUM(A1:A2)");
    await page.keyboard.press("Enter");
    await expect(cellAt(page, 2, 0)).toHaveText("30");

    // A3 복사 → B3 붙여넣기. 실제 클립보드를 거친다(권한 없이 되는 경로여야 한다).
    await focusCell(page, 2, 0);
    await page.keyboard.press("Control+c");
    await focusCell(page, 2, 1);
    const saved = waitForCellSave(page);
    await page.keyboard.press("Control+v");

    await expect(page.getByLabel("수식 입력줄")).toHaveValue("=SUM(B1:B2)");
    await expect(cellAt(page, 2, 1)).toHaveText("0"); // B1·B2가 비어 있으므로 0
    await saved;
  });

  test("E4: 엑셀에서 복사한 TSV(줄바꿈 포함 셀)를 붙여넣으면 그 모양대로 채워진다", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await createSheetPage(page, `e2e-sheet-tsv-${Date.now()}`);

    // 엑셀이 싣는 것과 같은 모양: 줄바꿈이 든 셀은 따옴표로 감싸여 온다.
    await page.evaluate(() =>
      navigator.clipboard.writeText('사과\t100\n"두\n줄"\t200'),
    );

    await focusCell(page, 0, 0);
    const saved = waitForCellSave(page);
    await page.keyboard.press("Control+v");

    await expect(cellAt(page, 0, 0)).toHaveText("사과");
    await expect(cellAt(page, 0, 1)).toHaveText("100");
    await expect(cellAt(page, 1, 1)).toHaveText("200");
    await saved;
  });

  test("채우기 핸들을 끌면 연속 데이터가 채워지고 Ctrl+Z로 되돌아간다", async ({ page }) => {
    await createSheetPage(page, `e2e-sheet-fill-${Date.now()}`);

    await focusCell(page, 0, 0);
    await page.keyboard.type("1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("2");
    await page.keyboard.press("Enter");

    // A1:A2를 잡고 핸들을 A4까지 끈다.
    await focusCell(page, 0, 0);
    await page.keyboard.press("Shift+ArrowDown");
    const handle = page.getByLabel("채우기 핸들");
    const box = (await handle.boundingBox())!;
    const target = (await cellAt(page, 3, 0).boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
      steps: 5,
    });
    const saved = waitForCellSave(page);
    await page.mouse.up();

    await expect(cellAt(page, 2, 0)).toHaveText("3");
    await expect(cellAt(page, 3, 0)).toHaveText("4");
    await saved;

    await page.keyboard.press("Control+z");
    await expect(cellAt(page, 2, 0)).toHaveText("");
    await expect(cellAt(page, 3, 0)).toHaveText("");
  });

  test("서식·열 너비·틀 고정·병합이 새로고침 뒤에도 남는다", async ({ page }) => {
    await createSheetPage(page, `e2e-sheet-fmt-${Date.now()}`);

    // A1에 값을 넣고 굵게 + 천 단위 서식.
    await focusCell(page, 0, 0);
    await page.keyboard.type("1234.5");
    await page.keyboard.press("Enter");
    await focusCell(page, 0, 0);

    const metaSave = page.waitForResponse(
      (res) =>
        res.url().includes("/rest/v1/sheets") &&
        res.request().method() === "PATCH" &&
        res.ok(),
    );
    await page.getByRole("button", { name: "굵게" }).click();
    await page.getByLabel("숫자 서식").selectOption("#,##0.00");
    await expect(cellAt(page, 0, 0)).toHaveText("1,234.50");
    await expect(cellAt(page, 0, 0)).toHaveClass(/font-bold/);
    await metaSave;

    // 열 너비를 끌어 넓힌다.
    const handle = page.getByLabel("A열 너비 조절");
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 5 });
    const widthSave = page.waitForResponse(
      (res) =>
        res.url().includes("/rest/v1/sheets") &&
        res.request().method() === "PATCH" &&
        res.ok(),
    );
    await page.mouse.up();
    await widthSave;

    // 틀 고정.
    await focusCell(page, 1, 0);
    const freezeSave = page.waitForResponse(
      (res) =>
        res.url().includes("/rest/v1/sheets") &&
        res.request().method() === "PATCH" &&
        res.ok(),
    );
    await page.getByRole("button", { name: "틀 고정" }).click();
    await freezeSave;

    // 병합: A3:B3을 합치면 좌상단 하나가 두 칸을 차지한다.
    await focusCell(page, 2, 0);
    await page.keyboard.press("Shift+ArrowRight");
    const mergeSave = page.waitForResponse(
      (res) =>
        res.url().includes("/rest/v1/sheets") &&
        res.request().method() === "PATCH" &&
        res.ok(),
    );
    await page.getByRole("button", { name: "병합" }).click();
    await mergeSave;
    await expect(
      page.locator('[role="row"][aria-rowindex="4"] [role="gridcell"][aria-colindex="3"]'),
    ).toHaveCount(0);

    // 새로고침해도 서식·너비·고정·병합이 남는다.
    await page.reload();
    // 새로고침하면 선택은 A1로 돌아간다. 병합 여부는 **선택한 칸** 기준이라 그 칸을 다시 고른다.
    await focusCell(page, 2, 0);
    await expect(page.getByRole("button", { name: "병합 해제" })).toBeVisible();
    await focusCell(page, 0, 0);
    await expect(cellAt(page, 0, 0)).toHaveText("1,234.50");
    await expect(cellAt(page, 0, 0)).toHaveClass(/font-bold/);
    const width = await cellAt(page, 0, 0).evaluate((el) => (el as HTMLElement).style.width);
    expect(Number.parseInt(width, 10)).toBeGreaterThan(150);
    await expect(page.getByRole("button", { name: "틀 고정 해제" })).toBeVisible();
  });

  test("행을 끼워 넣으면 수식 참조가 따라가고, 지우면 #REF!가 된다 (AC-12)", async ({
    page,
  }) => {
    await createSheetPage(page, `e2e-sheet-mutate-${Date.now()}`);

    await focusCell(page, 0, 0);
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");
    await page.keyboard.type("=A1*2");
    const firstSave = waitForCellSave(page);
    await page.keyboard.press("Enter");
    await expect(cellAt(page, 1, 0)).toHaveText("20");
    await firstSave;

    // A1 위에 행을 끼워 넣으면 값은 A2로, 수식은 A3으로 내려가고 참조도 따라간다.
    await focusCell(page, 0, 0);
    const insertSave = waitForCellSave(page);
    await page.getByRole("button", { name: "행 삽입" }).click();
    await expect(cellAt(page, 1, 0)).toHaveText("10");
    await expect(cellAt(page, 2, 0)).toHaveText("20");
    await focusCell(page, 2, 0);
    await expect(page.getByLabel("수식 입력줄")).toHaveValue("=A2*2");
    await insertSave;

    // 값이 있는 행을 지우면 그것을 가리키던 수식은 #REF!가 된다.
    await focusCell(page, 1, 0);
    const deleteSave = waitForCellSave(page);
    await page.getByRole("button", { name: "행 삭제" }).click();
    await expect(cellAt(page, 1, 0)).toHaveText("#REF!");
    await deleteSave;
  });

  test("시트를 더하고 다른 시트를 수식으로 참조한다 (AC-7)", async ({ page }) => {
    await createSheetPage(page, `e2e-sheet-tabs-${Date.now()}`);

    // Sheet2를 만들고 A1에 값을 넣는다.
    await page.getByRole("button", { name: "시트 추가" }).click();
    await expect(page.getByRole("tab", { name: "Sheet2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await focusCell(page, 0, 0);
    await page.keyboard.type("42");
    const save2 = waitForCellSave(page);
    await page.keyboard.press("Enter");
    await save2;

    // Sheet1으로 돌아와 Sheet2!A1을 참조한다.
    await page.getByRole("tab", { name: "Sheet1" }).click();
    await focusCell(page, 0, 0);
    await page.keyboard.type("=Sheet2!A1+1");
    const save1 = waitForCellSave(page);
    await page.keyboard.press("Enter");
    await expect(cellAt(page, 0, 0)).toHaveText("43");
    await save1;

    // 새로고침해도 시트 간 참조가 산다.
    await page.reload();
    await expect(cellAt(page, 0, 0)).toHaveText("43");
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
