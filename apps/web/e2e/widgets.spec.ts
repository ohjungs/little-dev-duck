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

test.describe("투두 위젯 빈 상태", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test("목록이 비어 있으면 안내 문구를 보여준다", async ({ page }) => {
    // 실제 테스트 계정은 이미 데이터가 있을 수 있어 진짜 빈 상태를 재현하기 어렵다.
    // listTodos의 GET 요청만 가로채 빈 배열을 응답해 TodoWidget.tsx의
    // "state === 'ready' && visibleTodos.length === 0" 분기(할 일이 없습니다.)를 결정적으로 재현한다.
    await page.route("**/rest/v1/todos*", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/");
    const widget = page.getByTestId("todo-widget");
    await expect(widget.getByText("할 일이 없습니다.")).toBeVisible();
  });
});

test.describe("투두/메모 위젯 에러 상태", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test("투두 목록 조회가 실패하면 에러 문구와 재시도 버튼을 보여준다", async ({
    page,
  }) => {
    // packages/api/src/todos.ts의 listTodos는 supabase.from("todos").select(...) 실패 시
    // error를 throw하고, TodoWidget의 fetchTodos가 이를 catch해 state를 "error"로 바꾼다.
    // 실제 백엔드를 건드리지 않기 위해 GET 요청만 500으로 모킹한다.
    await page.route("**/rest/v1/todos*", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal Server Error" }),
      });
    });

    await page.goto("/");
    const widget = page.getByTestId("todo-widget");
    await expect(widget.getByText("목록을 불러오지 못했습니다.")).toBeVisible();
    await expect(
      widget.getByRole("button", { name: "다시 시도" }),
    ).toBeVisible();
  });

  test("메모 목록 조회가 실패하면 에러 문구와 재시도 버튼을 보여준다", async ({
    page,
  }) => {
    // packages/api/src/memos.ts의 listMemos도 동일하게 error를 throw하는 구조라
    // GET 요청만 500으로 모킹해 MemoWidget의 error 분기를 재현한다.
    await page.route("**/rest/v1/memos*", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal Server Error" }),
      });
    });

    await page.goto("/");
    const widget = page.getByTestId("memo-widget");
    await expect(widget.getByText("목록을 불러오지 못했습니다.")).toBeVisible();
    await expect(
      widget.getByRole("button", { name: "다시 시도" }),
    ).toBeVisible();
  });
});

test.describe("투두 제목 유효성 검증", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test("공백만 입력한 제목은 추가되지 않는다", async ({ page }) => {
    await page.goto("/");
    const widget = page.getByTestId("todo-widget");

    // TodoWidget.tsx의 handleAdd는 newTitle.trim()이 빈 문자열이면 그 즉시 return하고
    // createTodo(API) 호출도, setActionError도 하지 않는 클라이언트 검증을 갖고 있다.
    // 로딩이 끝나 목록이 안정된 뒤에 항목 수를 세야 정확히 비교할 수 있다.
    await expect(widget.getByText("불러오는 중...")).toHaveCount(0);
    const initialCount = await widget.locator("li").count();

    const blankTitle = "   ";
    await widget.getByPlaceholder("할 일 추가").fill(blankTitle);
    await widget.getByRole("button", { name: "추가" }).click();

    // 조기 반환이므로 입력값(newTitle)도 지워지지 않고 그대로 남아 있어야 한다.
    await expect(widget.getByPlaceholder("할 일 추가")).toHaveValue(
      blankTitle,
    );
    await expect(widget.locator("li")).toHaveCount(initialCount);
    await expect(widget.getByRole("alert")).toHaveCount(0);
  });
});

test.describe("여러 항목 리스트 정합성", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test("여러 투두를 추가해도 각각 독립적으로 수정/삭제된다", async ({
    page,
  }) => {
    await page.goto("/");
    const widget = page.getByTestId("todo-widget");
    const base = `e2e-todo-multi-${Date.now()}`;
    const titleA = `${base}-A`;
    const titleB = `${base}-B`;

    const addTodo = async (title: string) => {
      await widget.getByPlaceholder("할 일 추가").fill(title);
      await widget.getByRole("button", { name: "추가" }).click();
      // 방금 만든 항목만 title로 유일하게 식별되므로(타임스탬프 접미사) hasText로
      // testid를 얻은 뒤, 이후에는 항상 그 testid로만 항목을 가리킨다.
      const row = widget.locator("li", { hasText: title });
      await expect(row).toBeVisible();
      const testId = await row.getAttribute("data-testid");
      return widget.getByTestId(testId!);
    };

    const itemA = await addTodo(titleA);
    const itemB = await addTodo(titleB);

    const editedTitleA = `${titleA}-edited`;
    await itemA.getByRole("button", { name: "수정" }).click();
    await itemA.locator("input").fill(editedTitleA);
    await itemA.getByRole("button", { name: "저장" }).click();
    await expect(itemA).toContainText(editedTitleA);
    // A만 수정했으므로 B는 원래 제목을 그대로 유지해야 한다.
    await expect(itemB).toContainText(titleB);

    await itemA.getByRole("button", { name: "삭제" }).click();
    await expect(itemA).toHaveCount(0);
    // A만 삭제했으므로 B는 계속 남아 있어야 한다.
    await expect(itemB).toBeVisible();

    await itemB.getByRole("button", { name: "삭제" }).click();
    await expect(itemB).toHaveCount(0);
  });

  test("여러 메모를 추가해도 각각 독립적으로 수정/삭제된다", async ({
    page,
  }) => {
    await page.goto("/");
    const widget = page.getByTestId("memo-widget");
    const base = `e2e-memo-multi-${Date.now()}`;
    const contentA = `${base}-A`;
    const contentB = `${base}-B`;

    const addMemo = async (content: string) => {
      await widget.getByPlaceholder("메모 (Ctrl+Enter로 추가)").fill(content);
      await widget.getByRole("button", { name: "추가" }).click();
      // 메모 카드는 div이고 data-testid가 없는 상위 래퍼 div도 같은 텍스트를 포함하지만,
      // 타임스탬프로 유일한 content 문자열을 포함하는 가장 안쪽 div는 항상 마지막
      // 매치이므로 .last()로 안전하게 실제 카드(memo-<id>)를 특정할 수 있다.
      const note = widget.locator("div", { hasText: content }).last();
      await expect(note).toBeVisible();
      const testId = await note.getAttribute("data-testid");
      return widget.getByTestId(testId!);
    };

    const noteA = await addMemo(contentA);
    const noteB = await addMemo(contentB);

    const editedContentA = `${contentA}-edited`;
    await noteA.getByRole("button", { name: "수정" }).click();
    await noteA.locator("textarea").fill(editedContentA);
    await noteA.getByRole("button", { name: "저장" }).click();
    await expect(noteA).toContainText(editedContentA);
    // A만 수정했으므로 B는 원래 내용을 그대로 유지해야 한다.
    await expect(noteB).toContainText(contentB);

    await noteA.getByRole("button", { name: "삭제" }).click();
    await expect(noteA).toHaveCount(0);
    // A만 삭제했으므로 B는 계속 남아 있어야 한다.
    await expect(noteB).toBeVisible();

    await noteB.getByRole("button", { name: "삭제" }).click();
    await expect(noteB).toHaveCount(0);
  });
});
