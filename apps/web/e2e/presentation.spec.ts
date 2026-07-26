import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// 2026-07-26 : 페이지 - 발표 - e2e (Phase 34 후속)
// 페이지 화면은 로그인 뒤에 있다 — widgets.spec.ts와 동일한 세션 스킵 가드.
//
// **여기서 검사하는 것은 배선이다**: 버튼 → 오버레이 → 키보드 조작 → 닫힘.
// 장 나누기 규칙(h1 경계·표지·상한)은 core `slides.test.ts` 18건이 이미 순수하게 잠갔다 —
// BlockNote에 실제로 타이핑해 제목을 만드는 건 에디터 입력 방식에 의존해 잘 깨진다.
// 그 부분까지 e2e로 끌고 오면 **테스트가 기능이 아니라 에디터를 검사**하게 된다.
const AUTH_STATE_PATH =
  process.env.E2E_AUTH_STATE ?? path.join(__dirname, ".auth/user.json");
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("발표 모드 (Phase 34)", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  // 새 페이지를 만들고 그 편집 화면에 도착한다. 발표 버튼은 페이지 편집 화면에만 있다.
  //
  // **"새 페이지"라는 이름의 버튼이 둘이다**(2026-07-26 확인):
  //  · 사이드바의 아이콘 버튼 — aria-label만 있고 글자가 없다. 누르면 **메뉴가 열릴 뿐** 안 만든다.
  //  · 오른쪽 빈 화면의 버튼 — 글자가 있고 누르면 **바로 만든다**.
  // 이름이 같아 first()로 잡으면 엉뚱한 쪽(메뉴)을 누른다. 글자 유무로 가른다.
  // (스크린리더에는 둘 다 "새 페이지 버튼"으로 읽힌다 — 별개 개선거리로 적어 뒀다.)
  async function openNewPage(page: import("@playwright/test").Page) {
    await page.goto("/pages");
    await page
      .getByRole("button", { name: "새 페이지" })
      .filter({ hasText: "새 페이지" })
      .click();
    // 페이지가 만들어지면 /pages/<id>로 이동한다.
    await page.waitForURL(/\/pages\/[0-9a-f-]{36}/);
    await expect(page.getByLabel("페이지 제목")).toBeVisible();
  }

  test("발표 버튼을 누르면 발표 화면이 열리고 Esc로 닫힌다", async ({ page }) => {
    await openNewPage(page);

    await page.getByRole("button", { name: "발표" }).click();
    const stage = page.getByRole("dialog", { name: "발표 모드" });
    await expect(stage).toBeVisible();

    // 편집 화면으로 돌아와야 한다 — 오버레이만 남으면 페이지가 가려진다.
    await page.keyboard.press("Escape");
    await expect(stage).toBeHidden();
    await expect(page.getByLabel("페이지 제목")).toBeVisible();
  });

  test("빈 페이지에서는 보여줄 내용이 없다고 알린다", async ({ page }) => {
    // 아무 말 없이 빈 화면만 뜨면 고장으로 보인다.
    await openNewPage(page);
    await page.getByRole("button", { name: "발표" }).click();

    const stage = page.getByRole("dialog", { name: "발표 모드" });
    await expect(stage).toContainText("발표할 내용이 없습니다");
  });

  test("이동 버튼에 접근 가능한 이름이 있고 첫 장에서는 이전이 막혀 있다", async ({
    page,
  }) => {
    // 아이콘만 있는 버튼이라 이름이 없으면 스크린리더에 "버튼"으로만 읽힌다.
    await openNewPage(page);
    await page.getByRole("button", { name: "발표" }).click();

    const stage = page.getByRole("dialog", { name: "발표 모드" });
    await expect(stage.getByRole("button", { name: "이전 장" })).toBeDisabled();
    await expect(stage.getByRole("button", { name: "발표 끝내기" })).toBeEnabled();
  });

  test("닫기 버튼으로도 끝난다", async ({ page }) => {
    await openNewPage(page);
    await page.getByRole("button", { name: "발표" }).click();

    const stage = page.getByRole("dialog", { name: "발표 모드" });
    await stage.getByRole("button", { name: "발표 끝내기" }).click();
    await expect(stage).toBeHidden();
  });
});
