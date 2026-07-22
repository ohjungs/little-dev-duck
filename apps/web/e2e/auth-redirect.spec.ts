import { existsSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("비로그인 사용자가 /에 접근하면 /login으로 리다이렉트된다", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/login");
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

// 과거 실제 회귀: NextResponse.redirect()가 상태코드를 명시하지 않으면 기본값 307을 쓰는데,
// 307은 원 요청의 HTTP 메서드(POST)를 그대로 유지한다. 리다이렉트 대상이 GET만 처리하는
// 페이지 라우트라면 브라우저가 그 대상에도 POST로 재요청해 405가 발생한다.
// (docs/anti-patterns/post-redirect-get.md, 수정: apps/web/src/proxy.ts와
// apps/web/src/app/auth/logout/route.ts 둘 다 303 명시로 수정됨)
// 아래 테스트들은 이 두 리다이렉트 지점이 항상 정확히 303을 반환하는지 검증한다.
// toBeLessThan(400) 같은 느슨한 assertion은 300번대 안에서 307(회귀)과 303(정상)을
// 구분하지 못하므로 이 파일에서는 정확한 303 값을 확인한다.

test.describe("미인증 리다이렉트 상태 코드 (proxy.ts)", () => {
  test("GET / 요청은 303으로 /login에 리다이렉트된다", async ({ request }) => {
    // maxRedirects: 0으로 리다이렉트를 따라가지 않아야 응답 자체의 status code를 볼 수
    // 있다. 따라가면 최종 목적지(/login, 200)만 보여 307/303 차이가 가려진다.
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
  });

  test("보호된 라우트(/)에 미인증 POST를 보내도 405가 아닌 303으로 리다이렉트된다", async ({
    request,
  }) => {
    // 회귀 재발 방지 테스트: proxy.ts의 미인증 리다이렉트가 기본값 307로 되돌아가면
    // 브라우저는 /login에도 POST로 재요청하게 되고, /login은 GET만 처리하는 페이지
    // 라우트라 405가 발생한다. 이게 과거 실제로 터졌던 버그(docs/anti-patterns/post-redirect-get.md)다.
    const response = await request.post("/", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
  });
});

// 로그아웃은 세션 쿠키가 있어야 실제 auth.signOut() 경로를 타므로, 다른 인증 필요 스펙과
// 동일한 스킵가드 패턴을 쓴다. 세션 생성 방법: e2e/README.md 참고.
const AUTH_STATE_PATH =
  process.env.E2E_AUTH_STATE ?? path.join(__dirname, ".auth/user.json");
const hasAuthState = existsSync(AUTH_STATE_PATH);

test.describe("로그아웃 라우트 리다이렉트 상태 코드", () => {
  test.skip(
    !hasAuthState,
    `인증 세션 파일이 없어 스킵합니다 (${AUTH_STATE_PATH}). e2e/README.md 참고.`,
  );
  test.use({ storageState: hasAuthState ? AUTH_STATE_PATH : undefined });

  test("POST /auth/logout은 303으로 /login에 리다이렉트된다", async ({
    request,
  }) => {
    // maxRedirects: 0으로 리다이렉트를 따라가지 않아야 apps/web/src/app/auth/logout/route.ts가
    // 실제로 보낸 status code(303)를 그대로 확인할 수 있다. 307로 회귀하면 이 값이 307이 된다.
    const response = await request.post("/auth/logout", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
  });
});
