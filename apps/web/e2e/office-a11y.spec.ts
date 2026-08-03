import { expect, test, type Page } from "@playwright/test";
import { AUTH_STATE } from "./authState";
import { expectFocusNotObscured, expectTabTrap } from "./modalA11yHelpers";

// 2026-08-03 : e2e - PixelOffice 모달 3종 - useModalA11y 배선 검증 (설계 계약 후속)
// 대상: 경영 관리 패널(OfficeManagementPanel) · NPC 대화 패널(OfficeTalkPanel) ·
// 단축키 도움말 오버레이(PixelOffice 내부, showHelp). 유닛 테스트가 이미 role/aria·
// 자동포커스·Esc-닫힘·(관리/대화 패널의) 언마운트 시 포커스 복원까지 잠갔다
// (OfficeManagementPanel.test.tsx·OfficeTalkPanel.test.tsx). PixelOffice 자신은
// canvas 2D·ResizeObserver·rAF가 jsdom에 없어 유닛 테스트를 두지 않기로 했다(설계 계약
// 명시) — 이 파일이 그 대체 검증이다.

function canvasLocator(page: Page) {
  return page.getByRole("img", { name: /픽셀 오리 오피스/ });
}

test.describe("PixelOffice — 모달 접근성 배선", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("경영 관리 패널 — 캔버스에 포커스가 있을 때 TAB으로 열고 Esc로 닫으면 포커스가 캔버스로 복원된다", async ({
    page,
  }) => {
    await page.goto("/office");
    const canvas = canvasLocator(page);
    await canvas.click();
    await expect(canvas).toBeFocused();

    await page.keyboard.press("Tab"); // InputManager: Tab(Shift 없음) -> "management" 액션
    const dialog = page.getByRole("dialog", { name: "경영 관리 패널" });
    await expect(dialog).toBeVisible();
    expect(await dialog.getAttribute("aria-modal")).toBe("true");
    await expectFocusNotObscured(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      canvas,
      "패널이 닫혔는데 포커스가 캔버스로 돌아오지 않았다 — WASD 이동이 재개되지 않는다",
    ).toBeFocused();
  });

  test("경영 관리 패널 — Tab 트랩(마지막→첫 요소, 첫 요소→마지막)", async ({ page }) => {
    await page.goto("/office");
    await page.getByRole("button", { name: "경영 관리 패널 열기" }).click();
    const dialog = page.getByRole("dialog", { name: "경영 관리 패널" });
    await expect(dialog).toBeVisible();

    await expectTabTrap(dialog, page);
  });

  test("NPC 대화 패널 — 관리 패널에서 직원을 선택하면 열리고 role/aria를 갖추며, Tab 트랩·Esc-닫힘이 동작한다", async ({
    page,
  }) => {
    await page.goto("/office");
    await page.getByRole("button", { name: "경영 관리 패널 열기" }).click();
    const mgmtDialog = page.getByRole("dialog", { name: "경영 관리 패널" });
    await expect(mgmtDialog).toBeVisible();

    // 부서 하나를 펼쳐 직원 행을 드러낸다. 로스터는 실데이터와 무관하게 buildAllNpcs가
    // 항상 채우므로(PixelOffice.tsx 확인함) 특정 부서명에 기대지 않고 첫 번째로 펼친다.
    await mgmtDialog.locator("button[aria-expanded]").first().click();
    await mgmtDialog.getByRole("button", { name: /상세 보기$/ }).first().click();

    const talkDialog = page.getByRole("dialog", { name: /대화 패널$/ });
    await expect(talkDialog).toBeVisible();
    expect(await talkDialog.getAttribute("aria-modal")).toBe("true");
    // onSelectNpc가 관리 패널을 닫는다(PixelOffice.tsx) — 겹쳐 뜨면 대화 패널이 가려진다.
    await expect(mgmtDialog).toBeHidden();
    await expectFocusNotObscured(page);

    await expectTabTrap(talkDialog, page);

    await page.keyboard.press("Escape");
    await expect(talkDialog).toBeHidden();
    // 참고(스코프 명시): 이 경로(관리 패널 → 선택)에서 훅의 "직전 포커스"는 캔버스가 아니라
    // 방금 클릭한 직원 행 버튼이다(그 버튼은 선택과 동시에 언마운트된다) — 그래서 여기서는
    // "포커스가 캔버스로 복원"을 단언하지 않는다. 캔버스에서 직접 여는 경로(걸어서 NPC 옆에
    // 도달 + E)는 NPC 화면 좌표가 카메라·타일 크기·오프셋에 좌우돼 자동화로 결정적으로
    // 재현하기 어려워 이 스위트 범위 밖으로 남겨 둔다(수동/QA 확인 대상 — 설계 계약의
    // 크로스커팅 체크리스트 1번). 캔버스-트리거 경로의 포커스 복원 자체는 같은 훅·같은
    // 컨테이너를 쓰는 아래 "단축키 도움말" 테스트가 대표 검증한다.
  });

  test("단축키 도움말 — 캔버스에 포커스가 있을 때 ?로 열고 Esc로 닫으면 포커스가 캔버스로 복원된다", async ({
    page,
  }) => {
    await page.goto("/office");
    const canvas = canvasLocator(page);
    await canvas.click();
    await expect(canvas).toBeFocused();

    await page.keyboard.press("?");
    const help = page.getByRole("dialog", { name: "단축키 도움말" });
    await expect(help).toBeVisible();
    expect(await help.getAttribute("aria-modal")).toBe("true");
    await expectFocusNotObscured(page);

    await page.keyboard.press("Escape");
    await expect(help).toBeHidden();
    await expect(canvas).toBeFocused();
  });

  // 회귀 잠금 — 설계 계약이 "정확성 필수 조건"으로 못박은 항목의 관찰가능한 결과.
  // 훅 첫 인자에 실제 showHelp 대신 리터럴 true를 넣으면, PixelOffice가 처음 마운트되는
  // 순간(의존성 배열이 [true]로 영원히 불변이라 최초 1회만 실행) 문서캡처 Escape 리스너가
  // 영구 등록된다. 이후로는 도움말을 연 적이 없어도 — 나중에 열리는 다른 모달(경영 관리
  // 패널 등)의 훅 리스너가 document에 더 늦게 등록된다는 이유만으로 — 그 영구 리스너가
  // 먼저 stopPropagation을 호출해 Escape를 삼켜 버린다. 도움말은 절대 열지 않고 이 경로만
  // 확인한다.
  test("도움말을 연 적이 없어도 Esc는 여전히 경영 관리 패널을 닫는다(showHelp 리터럴화 회귀 잠금)", async ({
    page,
  }) => {
    await page.goto("/office");
    await page.getByRole("button", { name: "경영 관리 패널 열기" }).click();
    const dialog = page.getByRole("dialog", { name: "경영 관리 패널" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(
      dialog,
      "Esc가 경영 관리 패널을 닫지 못했다 — PixelOffice의 showHelp가 실값이 아닐 가능성이 있다",
    ).toBeHidden();
  });
});
