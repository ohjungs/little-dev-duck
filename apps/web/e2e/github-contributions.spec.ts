import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// GitHub 잔디 위젯도 로그인 뒤에 있다 - widgets.spec.ts와 동일한 세션 스킵 가드.
const AUTH_STATE_PATH =
  process.env.E2E_AUTH_STATE ?? path.join(__dirname, ".auth/user.json");
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("GitHub 잔디 위젯", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test("로딩이 끝나면 잔디 그리드/미연동 안내/에러 상태 중 하나로 정착한다", async ({
    page,
  }) => {
    // GITHUB_TOKEN 설정 여부와 로그인 계정의 GitHub 연동 여부는 테스트 환경마다 달라
    // 그리드 렌더링 자체를 단정하지 않는다 - "불러오는 중..."에서 벗어나는지만 검증한다.
    await page.goto("/");
    const widget = page.getByTestId("github-contribution-widget");
    await expect(widget).toBeVisible();
    await expect(widget.getByText("불러오는 중...")).toHaveCount(0, {
      timeout: 10000,
    });
  });
});
