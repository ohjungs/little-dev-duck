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

// 2026-08-02 : e2e - 페이지 워크스페이스 - 삭제→휴지통 이동 경합 수정
// PageWorkspace의 삭제는 낙관적 업데이트라 사이드바에서 사라지는 건 softDeletePage(실제 PATCH)가
// 끝나기 전에 이미 반영된다(회귀 실측: /pages/trash로 즉시 이동하면 "휴지통이 비어 있습니다"로
// 보임 — is_trashed PATCH가 서버에 아직 반영되지 않은 상태에서 TrashView가 조회한 것). 삭제 버튼을
// 클릭하는 시점부터 waitForPageSave와 같은 PATCH 응답을 함께 기다려 결정적으로 만든다 —
// softDeletePage도 pages 테이블에 PATCH를 보내므로 같은 매처를 재사용한다.

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

    // 2026-08-02 : 회귀 - 페이지 워크스페이스 - 새로고침 후 본문 유실 (실측으로 발견 → 수정 확인)
    // PageWorkspace는 listPages()로만 목록을 채우는데, listPages는 content 컬럼을 select하지
    // 않는다(packages/api/src/pages.ts 주석: "페이지 열람 시 getPage로 full fetch"). PageWorkspace.tsx가
    // pageId 선택 시 content===null이면 getPage로 본문을 채운 뒤에만 PageEditor를 마운트하도록
    // 고쳐졌다(PageWorkspace.tsx의 "본문유실 - full fetch 보강" 주석 참고). 아래 두 단언은 이 라운드
    // 테스트 실행(2026-08-02, 실제 프로덕션 Supabase 대상)에서 green으로 확인됐다 — 회귀 고정 유지.
    await page.reload();
    await expect(page.getByLabel("페이지 제목")).toHaveValue(title);
    await expect(page.getByText(body)).toBeVisible();

    // 정리: 방금 만든 페이지를 휴지통으로 보낸다.
    const trashPatch = waitForPageSave(page);
    await page
      .locator("aside")
      .getByRole("button", { name: `${title} 삭제` })
      .click();
    await expect(
      page.locator("aside").getByText(title, { exact: true }),
    ).toHaveCount(0);
    // softDeletePage의 is_trashed PATCH가 실제로 서버에 반영될 때까지 기다린다 — 낙관적
    // 업데이트로 위 단언은 그보다 먼저 통과하므로, 이걸 기다리지 않고 아래 /pages/trash로
    // 이동하면 아직 커밋 전이라 "휴지통이 비어 있습니다"로 보이는 경합이 있었다(실측).
    await trashPatch;

    // 2026-08-02 : e2e - 페이지 워크스페이스 - 삭제→휴지통 실제 도착 확인
    // 위 단언은 "사이드바 트리에서 사라짐"만 증명한다 — 그것만으로는 휴지통에 도착했는지,
    // 아니면 그냥 유실됐는지 구별되지 않는다. /pages/trash로 직접 이동해 제목이 실제로
    // 거기 있는지 확인한다(TrashView.tsx: li 안 <p class="...font-medium"> 제목 텍스트).
    await page.goto("/pages/trash");
    await expect(page.getByText(title, { exact: true })).toBeVisible();
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

  // 2026-08-02 : e2e - 페이지 워크스페이스 - 사이드바 검색/정렬
  // 컴포넌트 테스트(PageWorkspace.test.tsx)는 PageEditor를 스텁으로 대체해 검증하지만,
  // 실제 입력 필드·select 조작이 실 브라우저에서도 그대로 동작하는지는 별도로 확인해야 한다.
  test("사이드바 검색으로 필터링하고 이름순 정렬로 순서를 바꿀 수 있다", async ({ page }) => {
    const ts = Date.now();
    const titleA = `e2e-${ts}-가가`;
    const titleB = `e2e-${ts}-나나`;

    async function createBlankPage(title: string) {
      await page.goto("/pages");
      await page.getByRole("button", { name: "새 페이지 메뉴" }).click();
      await page.getByRole("button", { name: "빈 페이지" }).click();
      await page.getByLabel("페이지 제목").fill(title);
      await page.locator('[contenteditable="true"]').first().click();
      await page.keyboard.type("본문");
      await waitForPageSave(page);
    }

    await createBlankPage(titleA);
    await createBlankPage(titleB);

    // 검색: "가가"로 좁히면 "나나"는 트리에서 사라진다.
    await page.getByLabel("페이지 검색").fill("가가");
    await expect(
      page.locator("aside").getByText(titleA, { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("aside").getByText(titleB, { exact: true }),
    ).toHaveCount(0);

    // 검색 초기화: 둘 다 다시 보인다.
    await page.getByLabel("검색 초기화").click();
    await expect(
      page.locator("aside").getByText(titleA, { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("aside").getByText(titleB, { exact: true }),
    ).toBeVisible();

    // 이름순 정렬: "가가"(ㄱ)가 "나나"(ㄴ)보다 앞에 온다.
    await page.getByLabel("페이지 정렬 기준").selectOption("name");
    const orderedTitles = (
      await page.locator("aside").getByRole("link").allTextContents()
    ).filter((t) => t.includes(titleA) || t.includes(titleB));
    expect(orderedTitles).toHaveLength(2);
    expect(orderedTitles[0]).toContain(titleA);
    expect(orderedTitles[1]).toContain(titleB);

    // 정리: 두 페이지 모두 휴지통으로 보낸다.
    await page
      .locator("aside")
      .getByRole("button", { name: `${titleA} 삭제` })
      .click();
    await page
      .locator("aside")
      .getByRole("button", { name: `${titleB} 삭제` })
      .click();
    await expect(
      page.locator("aside").getByText(titleA, { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator("aside").getByText(titleB, { exact: true }),
    ).toHaveCount(0);
  });
});
