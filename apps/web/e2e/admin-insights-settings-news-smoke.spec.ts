import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./authState";

// 2026-07-31 : e2e - 스모크 - 관리자/통계/뉴스/설정 4페이지
// 로그인 뒤 화면이라 widgets.spec.ts와 같은 AUTH_STATE 게이트를 쓴다. 이 파일의 목적은
// 각 화면이 최소한 렌더되는가(제목·핵심 랜드마크)만 확인하는 것이다 — 위젯별 CRUD는
// 각자의 스펙(widgets.spec.ts 등)이 담당한다.

test.describe("관리자/통계/뉴스/설정 스모크", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("/admin 관리자 화면이 렌더된다", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "관리자" }),
    ).toBeVisible();

    // 이 계정의 실제 role을 가정하지 않는다 — 비관리자 안내와 관리자 패널 고정 문구 중
    // 하나가 보이면 통과다.
    const nonAdminNotice = page.getByText(
      "사용자 관리는 관리자만 볼 수 있어요.",
    );
    const adminPanel = page.getByText("사용할 수 있는 기능");
    await expect(nonAdminNotice.or(adminPanel)).toBeVisible();
  });

  test("/insights 통계 화면이 렌더된다", async ({ page }) => {
    await page.goto("/insights");
    await expect(page.getByRole("heading", { name: "통계" })).toBeVisible();
  });

  test("/news 뉴스 브리핑 화면이 렌더된다", async ({ page }) => {
    await page.goto("/news");
    await expect(
      page.getByRole("heading", { name: "뉴스 브리핑" }),
    ).toBeVisible();
  });

  test("/settings 설정 화면이 5개 영역과 함께 렌더된다", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();

    // section + aria-labelledby는 암묵적으로 role="region"이 된다. id는 <h2>에 붙어 있으므로
    // id 셀렉터가 아니라 접근성 이름으로 region을 잡는다.
    for (const name of ["개인화", "연동", "데이터", "계정과 상태", "위험"]) {
      await expect(page.getByRole("region", { name })).toBeVisible();
    }
  });
});
