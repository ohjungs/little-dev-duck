import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// 반복 할 일(Phase 20)은 로그인 뒤 대시보드 위젯이라 저장된 세션이 있어야 돈다.
// 세션 생성 방법은 e2e/README.md 참고. 없으면 스킵된다(실패 아님).
const AUTH_STATE_PATH =
  process.env.E2E_AUTH_STATE ?? path.join(__dirname, ".auth/user.json");
const hasAuthState = existsSync(AUTH_STATE_PATH);

const TODO_ID = "00000000-0000-4000-8000-00000000e2e0";
const PLAIN_ID = "00000000-0000-4000-8000-00000000e2e1";
const ISO = "2026-07-28T00:00:00.000Z";

// 실제 계정 데이터에 기대지 않고 목록 조회만 가로채 고정 픽스처를 응답한다
// (기존 빈 상태·에러 상태 스펙과 같은 방식).
const rows = [
  {
    id: TODO_ID,
    user_id: "00000000-0000-4000-8000-0000000000aa",
    title: "e2e 반복 할 일",
    is_done: false,
    due_date: ISO,
    recurrence: "FREQ=WEEKLY;BYDAY=TU",
    created_at: ISO,
    updated_at: ISO,
  },
  {
    id: PLAIN_ID,
    user_id: "00000000-0000-4000-8000-0000000000aa",
    title: "e2e 일반 할 일",
    is_done: false,
    due_date: null,
    recurrence: null,
    created_at: ISO,
    updated_at: ISO,
  },
];

test.describe("반복 할 일 (Phase 20)", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test.beforeEach(async ({ page }) => {
    await page.route("**/rest/v1/todos*", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(rows),
      });
    });
  });

  test("반복이 걸린 항목에 주기가 표시된다", async ({ page }) => {
    await page.goto("/");
    const item = page.getByTestId(`todo-${TODO_ID}`);
    await expect(item).toContainText("매주 화");
  });

  test("반복이 없는 항목에는 주기 표시가 없다", async ({ page }) => {
    await page.goto("/");
    const item = page.getByTestId(`todo-${PLAIN_ID}`);
    await expect(item).toContainText("e2e 일반 할 일");
    await expect(item).not.toContainText("매주");
    await expect(item).not.toContainText("매일");
  });

  test("주기 선택은 아이콘 크기를 넘지 않는다 (제목 공간 잠식 금지)", async ({
    page,
  }) => {
    // select를 그대로 두면 안 보여도 선택된 옵션 글자만큼 가로 폭을 먹어서, 반복이 없는
    // 행까지 제목이 좁아진다. 폭을 고정으로 잠가 회귀를 막는다.
    await page.goto("/");
    const select = page.getByTestId(`todo-${PLAIN_ID}`).locator("select");
    const box = await select.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(24);
  });

  test("반복 주기 선택지에 현재 값과 해제 항목이 있다", async ({ page }) => {
    await page.goto("/");
    const select = page.getByTestId(`todo-${TODO_ID}`).locator("select");
    await expect(select).toHaveValue("FREQ=WEEKLY;BYDAY=TU");
    // 마감일(화요일) 기준 선택지 + 해제.
    const labels = await select.locator("option").allTextContents();
    expect(labels).toContain("반복 없음");
    expect(labels).toContain("매주 화");
  });

  test("완료해도 목록에서 사라지지 않고 다음 회차로 옮겨간다", async ({ page }) => {
    // 서버는 완료가 아니라 "다음 회차로 옮긴 상태"를 돌려준다 — 화면이 그 응답을 따라야 한다.
    await page.route("**/rest/v1/todos*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(rows),
        });
        return;
      }
      if (method === "PATCH") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...rows[0],
            is_done: false,
            due_date: "2026-08-04T00:00:00.000Z",
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/");
    const item = page.getByTestId(`todo-${TODO_ID}`);
    await item.locator('input[type="checkbox"]').check();

    // 체크된 채로 남으면 실제 서버 상태와 어긋난 것이다.
    await expect(item.locator('input[type="checkbox"]')).not.toBeChecked();
    await expect(item).toBeVisible();
    await expect(item).toContainText("매주 화");
  });

  test("좁은 화면에서도 가로 스크롤이 생기지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 690 });
    await page.goto("/");
    await expect(page.getByTestId(`todo-${TODO_ID}`)).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
