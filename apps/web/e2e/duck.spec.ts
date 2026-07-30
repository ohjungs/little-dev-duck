import { expect, test } from "@playwright/test";
import { AUTH_STATE } from "./authState";

// Duck 위젯도 로그인 뒤에 있다 - 세션 스킵 가드는 authState.ts 한 곳에 있다.
//
// 2026-07-30 : e2e - 오리 - r3f 캔버스 전제 폐기 (사용자 확정: 스프라이트가 현재 설계)
// 이 스펙들은 `duck-widget` 안에 `<canvas>`가 있고 좌표를 찍어 r3f 메시를 클릭한다는 전제로
// 쓰여 있었다. 지금 `packages/mascot/src/Duck.tsx`는 **CSS 스프라이트**다 — canvas도, r3f
// Canvas도 없다. 그래서 **통과할 수 없는 상태였다.** 프로덕션에서 WebGL2가 가용한 headless로
// 확인해도 canvas는 0개다(헤드리스 한계가 아니다). 인증 세션이 없어 9사이클 동안 스킵돼서
// 아무도 보지 못했다.
//
// 좌표 클릭 대신 실제 조작 지점인 버튼(`aria-label="오리 쓰다듬기"`)을 누른다 — 접근성 이름으로
// 찾으므로 내부 마크업이 또 바뀌어도 깨지지 않는다.

test.describe("오리 마스코트 (스프라이트)", () => {
  test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
  test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });

  test("홈 화면에 오리가 렌더링되고 쓰다듬으면 말풍선이 뜬다", async ({
    page,
  }) => {
    await page.goto("/");
    const duckWidget = page.getByTestId("duck-widget");
    await expect(duckWidget).toBeVisible();
    // 스프라이트 오리는 role="img"에 상태를 담은 접근성 이름을 붙인다(Duck.tsx).
    await expect(duckWidget).toHaveAttribute("role", "img");

    const pet = duckWidget.getByRole("button", { name: "오리 쓰다듬기" });
    await expect(pet).toBeVisible();

    // 첫 클릭은 항상 CLICK_PHRASES[0]("꽥!")이어야 한다 - clickCount 렌더링 타이밍 버그가
    // 생기면 이 정확한 문구 검증이 깨진다.
    await pet.click();
    await expect(duckWidget.getByText("꽥!")).toBeVisible();
  });

  test("연속 클릭 시 phrases 배열 순서대로 말풍선 문구가 바뀐다", async ({
    page,
  }) => {
    await page.goto("/");
    const duckWidget = page.getByTestId("duck-widget");
    const pet = duckWidget.getByRole("button", { name: "오리 쓰다듬기" });
    await expect(pet).toBeVisible();

    // packages/mascot/src/phrases.ts의 CLICK_PHRASES 순서 그대로다.
    // pickPhrase(clickCount)는 clickCount % length로 인덱스를 고정 계산하고,
    // Duck.tsx의 handleGreet은 클릭 시점의 clickCountRef.current로 문구를 먼저
    // 고정한 뒤 증가시키므로 페이지 새로고침 직후 첫 3회 클릭은 항상 이 순서다.
    const expectedSequence = ["꽥!", "오늘도 화이팅!", "할 일 하나 해볼까요?"];

    for (const expectedPhrase of expectedSequence) {
      await pet.click();
      await expect(duckWidget.getByText(expectedPhrase)).toBeVisible();
    }
  });

  test("빠른 연속 클릭(더블클릭)에도 말풍선에 중복/깨진 텍스트가 뜨지 않는다", async ({
    page,
  }) => {
    // 원래 이 스펙은 r3f 시절 겹친 메시(몸통/머리/부리/안경) 레이캐스트가 stopPropagation
    // 없이 클릭 한 번에 onGreet을 여러 번 불러 문구가 여러 칸 건너뛰던 회귀를 막으려고 썼다.
    // 스프라이트로 바뀐 뒤 클릭 대상은 버튼 하나라 그 원인은 사라졌지만, **검증의 가치는 남는다** —
    // 더블클릭이 정확히 2회분만 진행되고 말풍선이 중복 렌더되지 않는지 본다.
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/");
    const duckWidget = page.getByTestId("duck-widget");
    const pet = duckWidget.getByRole("button", { name: "오리 쓰다듬기" });
    await expect(pet).toBeVisible();

    await pet.dblclick();

    const bubble = duckWidget.getByText("오늘도 화이팅!");
    await expect(bubble).toBeVisible();
    // 말풍선 DOM이 중복 렌더링되어 같은 문구가 여러 개 뜨지 않는지 확인한다.
    await expect(bubble).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
  });
});
