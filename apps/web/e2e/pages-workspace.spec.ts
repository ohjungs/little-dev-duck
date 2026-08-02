import { expect, test, type Page as BrowserPage } from "@playwright/test";
import { AUTH_STATE } from "./authState";

// 2026-08-02 : e2e - 페이지 워크스페이스 - 생성/편집/자동저장/즐겨찾기/복제/삭제 critical path
// widgets.spec.ts와 같은 패턴: 로그인 뒤 화면이라 AUTH_STATE 게이트, 제목은 e2e-${Date.now()}
// 접두사(cleanup.ts가 정리 — pages 테이블도 정리 대상에 추가했다, e2e/README.md 계약 확장 기록 참고).
// 이 스펙이 만드는 데이터는 테스트 마지막에 UI로 직접 휴지통에 보내되, cleanup.ts가 프로덕션에
// 남는 e2e- 접두사 행을 최종 방어선으로 지운다(다른 스펙과 동일 이중 방어).
//
// "저장됨" 텍스트만으로 저장 완료를 기다리면 실측상 타이밍이 들쭉날쭉했다(같은 조작인데 3초~15초+).
// 결정적으로 기다리려면 실제 저장 요청(PATCH /rest/v1/pages) 자체를 기다려야 한다 — HD-003.
function waitForPageSave(page: BrowserPage) {
  return page.waitForResponse(
    (res) =>
      res.url().includes("/rest/v1/pages") &&
      res.request().method() === "PATCH" &&
      res.ok(),
  );
}

test.describe("페이지 워크스페이스 — 생성·편집·자동저장", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("빈 페이지를 만들어 제목·본문을 채우면 저장 요청이 정확한 내용으로 나가고, 새로고침 뒤에도 제목·본문이 남는다", async ({
    page,
  }) => {
    const title = `e2e-page-${Date.now()}`;
    const body = "자동저장 확인용 본문입니다";

    await page.goto("/pages");
    await page.getByRole("button", { name: "새 페이지 메뉴" }).click();
    await page.getByRole("button", { name: "빈 페이지" }).click();

    // 새 페이지로 이동해 PageEditor가 렌더될 때까지 제목 입력창을 기다린다.
    const titleInput = page.getByLabel("페이지 제목");
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);

    // BlockNote 본문 영역(contenteditable)을 클릭해 커서를 두고 입력한다.
    // next/dynamic(ssr:false)이라 마운트가 비동기라 클릭은 자동 대기(actionability)로 늦게 나타나도 잡는다.
    const editorBody = page.locator('[contenteditable="true"]').first();
    await editorBody.click();
    await page.keyboard.type(body);

    // 디바운스(800ms) 뒤 실제 저장 PATCH가 나간다. 응답을 직접 기다린다(텍스트 폴링보다 결정적).
    const saveRes = await waitForPageSave(page);
    const sentBody = saveRes.request().postDataJSON() as {
      title?: string;
      content?: unknown;
      plain_text?: string;
    };
    expect(sentBody.title).toBe(title);
    expect(sentBody.plain_text).toBe(body);
    expect(JSON.stringify(sentBody.content)).toContain(body);

    // 2026-08-02 : 회귀 - 페이지 워크스페이스 - 새로고침 후 본문 유실 (실측으로 발견한 버그)
    // PageWorkspace는 listPages()로만 목록을 채우는데, listPages는 content 컬럼을 select하지
    // 않는다(packages/api/src/pages.ts 주석: "페이지 열람 시 getPage로 full fetch" — 그런데
    // PageWorkspace/PageEditor 어디에도 getPage 호출이 없다, 2026-08-02 grep으로 확인).
    // 그래서 방금 저장한 본문이 서버에는 정확히 있는데(위 PATCH 요청 바디로 확인 완료),
    // 새로고침(또는 다른 페이지로 갔다 오는 클라이언트 내비게이션)으로 PageWorkspace가 다시
    // 마운트되면 이 페이지의 content가 null로 와서 화면에는 빈 문서로 보인다.
    // **이 아래 두 단언은 지금 실패한다.** 고쳐지지 않은 실제 버그를 감추지 않고 그대로 잠근다 —
    // getPage() 배선이 추가되면(또는 listPages가 content를 포함하게 바뀌면) green으로 바뀐다.
    await page.reload();
    await expect(page.getByLabel("페이지 제목")).toHaveValue(title);
    await expect(page.getByText(body)).toBeVisible();

    // 정리: 방금 만든 페이지를 휴지통으로 보낸다.
    await page
      .locator("aside")
      .getByRole("button", { name: `${title} 삭제` })
      .click();
    await expect(
      page.locator("aside").getByText(title, { exact: true }),
    ).toHaveCount(0);
  });

  test("즐겨찾기 토글과 복제가 동작한다", async ({ page }) => {
    const title = `e2e-page-fav-${Date.now()}`;
    const copyTitle = `${title} (복사본)`;

    await page.goto("/pages");
    await page.getByRole("button", { name: "새 페이지 메뉴" }).click();
    await page.getByRole("button", { name: "빈 페이지" }).click();

    const titleInput = page.getByLabel("페이지 제목");
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);
    // 본문도 한 글자 채운다 — 제목만 채우면 content가 null인 채 PATCH가 나가 DB의 not-null
    // 제약을 위반해 저장이 실패한다(위 스펙의 회귀 코멘트와 같은 원인). 이 테스트의 목적은
    // 즐겨찾기·복제이므로 그 별개 결함을 우회해 이 테스트 자체는 자기 목적에만 실패하게 한다.
    await page.locator('[contenteditable="true"]').first().click();
    await page.keyboard.type("본문");
    await waitForPageSave(page);

    // 즐겨찾기: 트리 행의 별 버튼을 누르면 사이드바 상단 즐겨찾기 섹션에 나타난다.
    await page
      .locator("aside")
      .getByRole("button", { name: `${title} 즐겨찾기` })
      .click();
    await expect(
      page.locator("aside").getByText(/^즐겨찾기 \(\d+\)$/),
    ).toBeVisible();
    // 즐겨찾기 섹션 + 트리, 두 곳에 같은 제목의 링크가 나타난다. 트리 쪽 링크는 "최근 수정됨"
    // 표시(제목 dot)의 title 속성이 접근성 이름에 더해져 정확히 같지 않으므로 exact를 쓰지 않는다.
    await expect(
      page.locator("aside").getByRole("link", { name: new RegExp(`^${title}`) }),
    ).toHaveCount(2);

    // 복제: 상단 툴바의 "복제" 버튼(PageEditor)을 누르면 createPage(POST) 후 새 페이지로 이동한다.
    // exact 매칭 필수 — getByRole 이름은 기본 부분일치라 트리 행의 "OOO 복제"들과도 겹친다.
    await page.getByRole("button", { name: "복제", exact: true }).click();
    await expect(page.getByLabel("페이지 제목")).toHaveValue(copyTitle);

    // 정리: 원본과 복사본을 모두 휴지통으로 보낸다.
    await page
      .locator("aside")
      .getByRole("button", { name: `${copyTitle} 삭제` })
      .click();
    await page
      .locator("aside")
      .getByRole("button", { name: `${title} 삭제` })
      .click();
    await expect(
      page.locator("aside").getByText(title, { exact: true }),
    ).toHaveCount(0);
  });
});
