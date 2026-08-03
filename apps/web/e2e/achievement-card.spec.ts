import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./authState";

// 2026-08-03 : e2e - 성과카드 - 캔버스 접근성 (WCAG 2.1 SC 1.1.1)
// AchievementCard의 <canvas>(800x800, PNG 저장용)는 레벨/XP/먹이를 픽셀로만 그려 텍스트
// 대체가 없었다. role="img" + aria-label로 고쳤다(AchievementCard.tsx). jsdom 렌더 테스트
// (src/components/__tests__/AchievementCard.test.tsx)는 이미 aria-label 계산을 검증하지만
// dom-accessibility-api의 근사치다 — 여기서는 실브라우저 접근성 트리로 다시 확인한다.
//
// duck_state는 사용자당 1행이고 최초 접속 시 기본값 행을 자동 생성한다(getDuckState,
// packages/api/src/duckState.ts) — 그래서 "성과 카드" 버튼은 로그인한 계정이면 항상 나타난다.
// 실계정 데이터는 사이클마다 바뀌므로 레벨/XP/먹이 값을 하드코딩하지 않는다 — 화면에 보이는
// 배지·통계 텍스트에서 실제 숫자를 읽어 기대 aria-label을 만들고, 캔버스 접근 가능한 이름과
// 대조한다(표시값과 접근성 이름이 어긋나는 회귀를 잡는다).

test.describe("성과 카드 — 캔버스 접근성", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("성과 카드를 열면 캔버스가 레벨/XP/먹이를 담은 접근 가능한 이름을 갖는다", async ({
    page,
  }) => {
    await page.goto("/");

    const levelBadge = page.getByTestId("duck-level");
    await expect(levelBadge).toBeVisible();
    const levelText = (await levelBadge.innerText()).trim();
    const levelMatch = /(\d+)/.exec(levelText);
    expect(levelMatch, `레벨 배지 텍스트에서 숫자를 못 읽음: "${levelText}"`).not.toBeNull();
    const level = levelMatch![1];

    const stats = page.getByTestId("duck-stats");
    await expect(stats).toBeVisible();
    const statsText = await stats.innerText();
    const xpMatch = /XP\s*(\d+)/.exec(statsText);
    const feedMatch = /먹이\s*(\d+)/.exec(statsText);
    expect(xpMatch, `통계 텍스트에서 XP를 못 읽음: "${statsText}"`).not.toBeNull();
    expect(feedMatch, `통계 텍스트에서 먹이를 못 읽음: "${statsText}"`).not.toBeNull();
    const xp = xpMatch![1];
    const feed = feedMatch![1];

    await stats.getByRole("button", { name: "성과 카드" }).click();

    const dialog = page.getByRole("dialog", { name: "성과 카드" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    const expectedLabel = `레벨 ${level}, XP ${xp}, 먹이 ${feed}`;
    const canvas = dialog.getByRole("img", { name: expectedLabel });
    await expect(canvas).toBeVisible();
    expect(await canvas.evaluate((el) => el.tagName)).toBe("CANVAS");

    await dialog.getByRole("button", { name: "닫기" }).click();
    await expect(dialog).toBeHidden();
  });
});
