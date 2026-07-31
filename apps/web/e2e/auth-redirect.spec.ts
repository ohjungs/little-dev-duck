import { expect, test } from "@playwright/test";

// Phase 13 T4: 비로그인 접근은 마케팅 랜딩(/welcome)으로 보낸다(로그인 폼은 랜딩 CTA로 도달).
test("비로그인 사용자가 /에 접근하면 /welcome(랜딩)으로 리다이렉트된다", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/welcome");
  expect(response?.status()).toBeLessThan(400);
});

test("/login에 Google/GitHub 로그인 버튼이 보인다", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Google로 계속하기" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "GitHub로 계속하기" }),
  ).toBeVisible();
});

// 2026-07-26 : 인증 - 비밀번호 재설정 - 세션 없는 접근 (Phase 41 T3)
// /auth/reset은 **현재 비밀번호를 묻지 않고** 새 비밀번호를 받는 화면이다(잊어서 온 사람에게
// 물으면 재설정이 성립하지 않는다). 그래서 세션 없이 그 폼이 렌더되면 안 된다.
// 방어선이 둘이다: proxy.ts의 인증 게이트(여기서 검사)와 페이지 자체의 세션 판정.
// 게이트 쪽은 경로 목록이라 **다른 이유로 편집되다 조용히 열릴 수 있다** — 그래서 못박는다.
test("세션 없이 /auth/reset을 열면 비밀번호 폼에 닿지 못한다", async ({
  request,
}) => {
  const response = await request.get("/auth/reset", { maxRedirects: 0 });
  // 303인지까지 본다(307이면 POST 메서드가 유지돼 405가 되는 그 회귀다 — 아래 주석 참조).
  expect(response.status(), "공개 경로로 열리면 이 값이 200이 된다").toBe(303);
  expect(new URL(response.headers().location, "http://x").pathname).toBe(
    "/welcome",
  );
});

// 과거 실제 회귀: NextResponse.redirect()가 상태코드를 명시하지 않으면 기본값 307을 쓰는데,
// 307은 원 요청의 HTTP 메서드(POST)를 그대로 유지한다. 리다이렉트 대상이 GET만 처리하는
// 페이지 라우트라면 브라우저가 그 대상에도 POST로 재요청해 405가 발생한다.
// (docs/anti-patterns/post-redirect-get.md, 수정: apps/web/src/proxy.ts와
// apps/web/src/app/auth/logout/route.ts 둘 다 303 명시로 수정됨)
// 아래 테스트들은 이 두 리다이렉트 지점이 항상 정확히 303을 반환하는지 검증한다.
// toBeLessThan(400) 같은 느슨한 assertion은 300번대 안에서 307(회귀)과 303(정상)을
// 구분하지 못하므로 이 파일에서는 정확한 303 값을 확인한다.

test.describe("미인증 리다이렉트 상태 코드 (proxy.ts)", () => {
  test("GET / 요청은 303으로 /welcome에 리다이렉트된다", async ({
    request,
  }) => {
    // maxRedirects: 0으로 리다이렉트를 따라가지 않아야 응답 자체의 status code를 볼 수
    // 있다. 따라가면 최종 목적지(/welcome, 200)만 보여 307/303 차이가 가려진다.
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
  });

  test("보호된 라우트(/)에 미인증 POST를 보내도 405가 아닌 303으로 리다이렉트된다", async ({
    request,
  }) => {
    // 회귀 재발 방지 테스트: proxy.ts의 미인증 리다이렉트가 기본값 307로 되돌아가면
    // 브라우저는 /welcome에도 POST로 재요청하게 되고, /welcome은 GET만 처리하는 페이지
    // 라우트라 405가 발생한다. 이게 과거 실제로 터졌던 버그(docs/anti-patterns/post-redirect-get.md)다.
    const response = await request.post("/", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
  });
});

// 2026-07-31 : e2e - 로그아웃 검사 - 세션 격리 (실측으로 잡은 결함)
//
// 이 검사는 **공유 세션을 쓰면 안 된다.** 로그아웃은 그 세션의 리프레시 토큰을 실제로 폐기하는데,
// 모든 스펙이 세션 파일 **하나**를 공유하므로 여기서 로그아웃하면 **뒤따르는 모든 인증 스펙이
// 로그아웃된 채로 돈다.** 알파벳순으로 이 파일이 두 번째라 피해가 43건이었다.
//
// 오래 안 보였던 이유: 세션 파일이 없어 인증 스펙이 전부 스킵돼 **한 번도 같이 돌아본 적이
// 없었다.** globalSetup이 스스로 로그인하게 되자 그날 바로 드러났다.
//
// `scope: "local"`로 바꿔도 해결되지 않는다(실측) — local도 **그 세션**을 끊고, 모든 컨텍스트가
// 바로 그 세션을 쓰고 있기 때문이다. 범위 문제가 아니라 **공유 문제**다.
//
// 그래서 이 검사만 **자기 세션을 새로 만들어** 쓴다. 끊어도 남에게 영향이 없다.
test.describe("로그아웃 라우트 리다이렉트 상태 코드", () => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(
    !email || !password,
    "E2E_EMAIL/E2E_PASSWORD가 없으면 버릴 세션을 만들 수 없습니다(e2e/README.md).",
  );
  // 공유 세션을 **일부러 쓰지 않는다** — 위 사유.
  test.use({ storageState: undefined });

  test("POST /auth/logout은 303으로 /login에 리다이렉트된다", async ({ page }) => {
    // 이 검사 전용 세션을 실제 로그인 화면으로 만든다.
    await page.goto("/login");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole("button", { name: "이메일로 로그인" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    // maxRedirects: 0으로 리다이렉트를 따라가지 않아야 apps/web/src/app/auth/logout/route.ts가
    // 실제로 보낸 status code(303)를 그대로 확인할 수 있다. 307로 회귀하면 이 값이 307이 된다.
    const response = await page.request.post("/auth/logout", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
  });
});
