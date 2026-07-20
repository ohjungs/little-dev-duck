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

  // 아래부터는 /api/github/contributions 응답을 page.route()로 모킹해 4개 상태
  // (그리드/미연동/에러) 중 나머지 3개를 강제로 재현한다. 실제 백엔드나 GITHUB_TOKEN
  // 설정에 의존하지 않고도 GithubContributionWidget.tsx의 각 분기를 결정적으로 검증한다.
  const CONTRIBUTIONS_API_PATTERN = "**/api/github/contributions";

  // GithubContributionWidget.tsx의 ContributionDay 셰이프(date, count)를 그대로 따른다.
  // 7일 단위로 chunkIntoWeeks()가 잘라내므로 14일(=정확히 2주)을 써서 셀 개수 검증을
  // days.length와 1:1로 맞춘다.
  const MOCK_DAYS = Array.from({ length: 14 }, (_, i) => ({
    date: `2026-07-${String(i + 1).padStart(2, "0")}`,
    count: i % 5, // 0~4를 순환시켜 레벨별 분기(levelForCount)도 함께 지나가게 한다.
  }));
  const MOCK_TOTAL_COUNT = MOCK_DAYS.reduce((sum, day) => sum + day.count, 0);

  test.describe("잔디 그리드 상태", () => {
    test("정상 응답을 모킹하면 잔디 그리드 셀이 데이터 개수만큼 렌더링된다", async ({
      page,
    }) => {
      await page.route(CONTRIBUTIONS_API_PATTERN, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            linked: true,
            summary: { totalCount: MOCK_TOTAL_COUNT, days: MOCK_DAYS },
          }),
        });
      });

      await page.goto("/");
      const widget = page.getByTestId("github-contribution-widget");
      await expect(widget).toBeVisible();
      await expect(
        widget.getByText(`최근 1년간 ${MOCK_TOTAL_COUNT}개의 기여`),
      ).toBeVisible();

      // 각 잔디 셀은 data-testid 없이 title="{date}: {count}개 기여"만 갖는다
      // (GithubContributionWidget.tsx의 cellStyle/title 렌더링부 참고). Card/Button
      // 컴포넌트는 title 속성을 쓰지 않으므로 위젯 내부에서 title 속성을 가진 div는
      // 잔디 셀뿐이라 이 선택자로 안전하게 셀만 골라낼 수 있다.
      const cells = widget.locator("div[title]");
      await expect(cells).toHaveCount(MOCK_DAYS.length);

      // 셀이 자리만 채운 더미가 아니라 실제 모킹 데이터를 반영하는지 대표로 한 칸 확인한다.
      const firstDay = MOCK_DAYS[0];
      await expect(
        widget.getByTitle(`${firstDay.date}: ${firstDay.count}개 기여`),
      ).toBeVisible();
    });
  });

  test.describe("GitHub 미연동 상태", () => {
    test("API가 linked:false를 반환하면 미연동 안내 문구가 표시된다", async ({
      page,
    }) => {
      // route.ts는 로그인 계정에 GitHub identity가 없으면 { linked: false }를 200으로
      // 내려준다 (getGithubLogin이 null을 반환하는 분기). 컴포넌트는 이 값으로
      // "GitHub 계정으로 로그인하면 잔디를 볼 수 있어요." 안내를 렌더링한다.
      await page.route(CONTRIBUTIONS_API_PATTERN, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ linked: false }),
        });
      });

      await page.goto("/");
      const widget = page.getByTestId("github-contribution-widget");
      await expect(widget).toBeVisible();
      await expect(
        widget.getByText("GitHub 계정으로 로그인하면 잔디를 볼 수 있어요."),
      ).toBeVisible();
    });
  });

  test.describe("에러 상태", () => {
    test("API가 500을 반환하면 에러 문구와 다시 시도 버튼이 표시된다", async ({
      page,
    }) => {
      // 컴포넌트는 res.ok만 확인하고 본문은 읽지 않으므로(!res.ok면 즉시 throw),
      // route.ts가 실제로 502를 내는 케이스(fetchGithubContributions 실패)까지
      // 재현할 필요 없이 임의의 5xx로도 동일한 에러 분기를 검증할 수 있다.
      await page.route(CONTRIBUTIONS_API_PATTERN, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "GITHUB_TOKEN 환경변수가 설정되지 않았습니다." }),
        });
      });

      await page.goto("/");
      const widget = page.getByTestId("github-contribution-widget");
      await expect(widget).toBeVisible();
      await expect(widget.getByText("잔디를 불러오지 못했습니다.")).toBeVisible();
      await expect(
        widget.getByRole("button", { name: "다시 시도" }),
      ).toBeVisible();
    });

    test("네트워크 요청이 실패하면 에러 문구와 다시 시도 버튼이 표시된다", async ({
      page,
    }) => {
      // fetch() 자체가 reject되는 케이스(오프라인, DNS 실패 등)를 route.abort()로
      // 재현한다. GithubContributionWidget.tsx의 fetchContributions는 res.ok 검사
      // 이전에 fetch가 던지는 예외도 동일한 catch에서 잡아 state를 "error"로 둔다.
      await page.route(CONTRIBUTIONS_API_PATTERN, async (route) => {
        await route.abort("failed");
      });

      await page.goto("/");
      const widget = page.getByTestId("github-contribution-widget");
      await expect(widget).toBeVisible();
      await expect(widget.getByText("잔디를 불러오지 못했습니다.")).toBeVisible();
      await expect(
        widget.getByRole("button", { name: "다시 시도" }),
      ).toBeVisible();
    });
  });
});
