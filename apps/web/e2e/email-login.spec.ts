import { expect, test, type Page } from "@playwright/test";
import { authErrorMessage } from "@ldd/core";

// 2026-07-31 : e2e - 이메일로그인 - 실브라우저층계약 (Phase 41 T1~T3)
// **로그인 없이 도는 스펙이다**(세션 가드 없음) — CI에서도 실제로 실행된다.
//
// 계층 소유권(중복 단언 금지). 여기서 안 하는 것:
//   - 오류 원문 → 한국어 문구 **매핑**은 렌더 테스트 몫이다
//     (src/app/login/__tests__/LoginForm.test.tsx). 여기서는 "한국어 alert가 실제로 보이고
//     영문이 새지 않는다"까지만 본다.
//   - 상한의 **인자·키 정규화**도 렌더 몫이다. 여기서는 **요청 횟수**만 센다(E6).
//   - busy 재진입 차단도 렌더 몫이다.
// 여기서만 할 수 있는 것: HTML5 required 차단(E1), 성공 시 **실제 페이지 이동**(E5),
// 그리고 브라우저가 진짜로 네트워크에 나갔는지(E6).
//
// **실계정 가입·로그인은 0건이다.** 모든 GoTrue 호출은 page.route로 가로챈다. 등록 순서가
// 계약이다: 포괄 가드(`**/auth/v1/**` → 카운트 후 abort)를 **먼저**, 구체 핸들러를 **나중에**
// 건다(Playwright는 마지막에 등록한 라우트를 먼저 본다). 이 순서 덕에 예상 못 한 인증 호출은
// 프로덕션에 닿지 않고 abort되고, 카운터에 남아 눈에 띈다.
// glob은 호스트를 적지 않는다 — Supabase URL은 환경변수라 CI와 로컬이 다르다.

const AUTH_GLOB = "**/auth/v1/**";
const TOKEN_GLOB = "**/auth/v1/token**";
const SIGNUP_GLOB = "**/auth/v1/signup**";
const RECOVER_GLOB = "**/auth/v1/recover**";

const EMAIL = "e2e-no-such-user@example.com";
const PASSWORD = "correct-horse-battery-staple";

// GoTrue 400 본문의 실제 셰이프. supabase-js는 여기서 `msg`를 뽑아 error.message로 준다 —
// 그 추출은 supabase-js 내부 계약이라 단언 대상이 아니고, 우리는 화면 결과만 본다.
const INVALID_CREDENTIALS_MSG = "Invalid login credentials";
const INVALID_CREDENTIALS_BODY = {
  code: 400,
  error_code: "invalid_credentials",
  msg: INVALID_CREDENTIALS_MSG,
};

const LATIN = /[A-Za-z]/;

type AuthCalls = { urls: string[] };

// 포괄 가드. **goto 이전에** 걸어야 첫 렌더가 만드는 호출까지 잡힌다.
async function guardAuth(page: Page): Promise<AuthCalls> {
  const calls: AuthCalls = { urls: [] };
  await page.route(AUTH_GLOB, async (route, request) => {
    calls.urls.push(request.url());
    await route.abort();
  });
  return calls;
}

async function json(
  route: Parameters<Parameters<Page["route"]>[1]>[0],
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function tab(page: Page, name: "로그인" | "가입") {
  // 탭 버튼과 제출 버튼("이메일로 로그인")의 이름이 서로의 부분문자열이라 exact가 필요하다.
  return page
    .getByRole("group", { name: "이메일 로그인 또는 가입 선택" })
    .getByRole("button", { name, exact: true });
}

// exact가 필요하다: 탭 묶음의 aria-label("이메일 로그인 또는 가입 선택")이 "이메일"을 품고 있어
// 느슨한 매칭이면 입력칸과 함께 두 개가 잡힌다(실측: strict mode violation).
function emailInput(page: Page) {
  return page.getByLabel("이메일", { exact: true });
}

// 2026-07-31 : e2e - 환경사실 - next라우트어나운서도role=alert다
// **페이지 전역에서 `getByRole("alert")`를 쓰면 안 된다.** Next가 항상 심어 두는
// `<div role="alert" aria-live="assertive" id="__next-route-announcer__">`가 함께 잡혀
// strict mode violation이 나거나, "alert 없음"(toHaveCount(0))이 영원히 실패한다(실측).
// 구현 결함이 아니다 — 어나운서는 라우트 이동 때만 채워지는 빈 요소다. 그래서 폼 안으로
// 범위를 좁힌다. jsdom 렌더 테스트에는 Next 런타임이 없어 이 문제가 없다(계층별로 다르다).
function formAlert(page: Page) {
  return page.locator("form").getByRole("alert");
}

function formStatus(page: Page) {
  return page.locator("form").getByRole("status");
}

async function fill(page: Page, email = EMAIL): Promise<void> {
  await emailInput(page).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(PASSWORD);
}

test.describe("이메일 로그인 (실브라우저)", () => {
  test("E1: 빈 폼은 브라우저가 막는다 — 인증 요청이 한 건도 나가지 않는다", async ({
    page,
  }) => {
    const calls = await guardAuth(page);
    await page.goto("/login");

    await page.getByRole("button", { name: "이메일로 로그인" }).click();

    // 브라우저 기본 검증이 폼 제출을 잡았다는 사실 자체를 확인한다(문구는 브라우저·언어마다
    // 달라 단언하지 않는다).
    const valid = await page
      .locator('input[type="email"]')
      .evaluate((el) => (el as HTMLInputElement).checkValidity());
    expect(valid).toBe(false);
    await expect(page).toHaveURL(/\/login$/);
    // 음성 단언(요청이 없다)은 기다릴 대상이 없어 정착 시간을 준다.
    await page.waitForTimeout(500);
    expect(calls.urls).toHaveLength(0);
  });

  test("E2: 자격증명 실패는 한국어 alert로 보이고 영문 원문이 새지 않는다", async ({
    page,
  }) => {
    const calls = await guardAuth(page);
    await page.route(TOKEN_GLOB, async (route, request) => {
      calls.urls.push(request.url());
      await json(route, 400, INVALID_CREDENTIALS_BODY);
    });
    await page.goto("/login");

    await fill(page);
    await page.getByRole("button", { name: "이메일로 로그인" }).click();

    const alert = formAlert(page);
    await expect(alert).toBeVisible();
    // 매핑 자체는 렌더 테스트가 잠근다. 여기선 "영문이 그대로 뜨지 않는다"만 본다.
    await expect(alert).not.toContainText(LATIN);
    await expect(formStatus(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);
    expect(calls.urls).toHaveLength(1);
  });

  test("E3: 가입은 확인 메일 안내로 끝나고 페이지를 떠나지 않는다", async ({
    page,
  }) => {
    const calls = await guardAuth(page);
    await page.route(SIGNUP_GLOB, async (route, request) => {
      calls.urls.push(request.url());
      // 메일 확인이 켜진 프로젝트의 응답: 세션 없이 사용자만 온다.
      await json(route, 200, {
        id: "00000000-0000-0000-0000-000000000001",
        aud: "authenticated",
        role: "",
        email: EMAIL,
        confirmation_sent_at: new Date().toISOString(),
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: {},
        created_at: new Date().toISOString(),
      });
    });
    await page.goto("/login");

    await tab(page, "가입").click();
    await fill(page);
    await page.getByRole("button", { name: "이메일로 가입" }).click();

    const status = formStatus(page);
    await expect(status).toBeVisible();
    await expect(status).not.toContainText(LATIN);
    await expect(formAlert(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("E4: 재설정 요청은 가입 여부를 말하지 않는 안내로 끝난다", async ({
    page,
  }) => {
    const calls = await guardAuth(page);
    await page.route(RECOVER_GLOB, async (route, request) => {
      calls.urls.push(request.url());
      // GoTrue는 가입되지 않은 주소에도 200을 준다(계정 열거 차단). 화면도 같아야 의미가 있다.
      await json(route, 200, {});
    });
    await page.goto("/login");

    await emailInput(page).fill(EMAIL);
    await page.getByRole("button", { name: "비밀번호를 잊으셨나요?" }).click();

    const status = formStatus(page);
    await expect(status).toBeVisible();
    await expect(status).not.toContainText(LATIN);
    await expect(formAlert(page)).toHaveCount(0);
    expect(calls.urls).toHaveLength(1);
  });

  test("E5: 성공 응답을 받으면 오류 없이 /login을 실제로 떠난다", async ({
    page,
  }) => {
    // 2026-07-31 : e2e - 한계 - 서버세션은위조하지않는다
    // **이 스펙이 증명하는 것**: 클라이언트가 성공 응답을 받으면 SPA 상태 변경이 아니라
    // **전체 페이지 이동**이 실제로 일어난다(window.location.assign — 서버 컴포넌트가 세션을
    // 다시 읽게 하려는 설계 의도 그 자체).
    // **증명하지 않는 것**: 최종 목적지가 `/`라는 것. 아래 토큰은 서명이 없는 가짜라
    // 서버(proxy.ts)가 Supabase에 되물어 거부하고 미인증 경로로 보낸다. 진짜 목적지 검증은
    // 실계정 세션이 필요한데, 이 파일의 전제는 **실계정 로그인 0건**이다.
    // "/"로 갔다는 단언은 렌더 테스트(S1)가 assign 호출로 잠근다 — 두 층이 합쳐 계약을 덮는다.
    const calls = await guardAuth(page);
    await page.route(TOKEN_GLOB, async (route, request) => {
      calls.urls.push(request.url());
      const now = Math.floor(Date.now() / 1000);
      const b64 = (o: unknown) =>
        Buffer.from(JSON.stringify(o)).toString("base64url");
      await json(route, 200, {
        access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({
          sub: "00000000-0000-0000-0000-000000000002",
          aud: "authenticated",
          role: "authenticated",
          email: EMAIL,
          iat: now,
          exp: now + 3600,
        })}.e2e-unsigned`,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: "e2e-fake-refresh-token",
        user: {
          id: "00000000-0000-0000-0000-000000000002",
          aud: "authenticated",
          role: "authenticated",
          email: EMAIL,
          app_metadata: { provider: "email", providers: ["email"] },
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      });
    });
    await page.goto("/login");

    await fill(page);
    await page.getByRole("button", { name: "이메일로 로그인" }).click();

    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    // **이동했다는 사실 자체가 "오류 분기를 타지 않았다"의 증거다** — 오류면 문구를 세우고 그
    // 자리에서 return하므로 이동이 아예 없다. 그래서 여기서 alert를 또 세지 않는다(이동 후
    // 폼이 사라진 화면에서 "alert 0건"은 공허하게 통과한다).
    // 대신 진짜로 문서가 바뀌었는지를 본다 — 로그인 폼이 화면에서 사라졌다.
    await expect(page.locator('form input[type="email"]')).toHaveCount(0);
  });

  test("E6: 6번째 시도는 네트워크에 나가지 않는다 — 요청은 5건에서 멈춘다", async ({
    page,
  }) => {
    const calls = await guardAuth(page);
    await page.route(TOKEN_GLOB, async (route, request) => {
      calls.urls.push(request.url());
      await json(route, 400, INVALID_CREDENTIALS_BODY);
    });
    await page.goto("/login");

    await fill(page);
    const submit = page.getByRole("button", { name: "이메일로 로그인" });
    const alert = formAlert(page);

    for (let i = 1; i <= 5; i += 1) {
      await submit.click();
      await expect.poll(() => calls.urls.length).toBe(i);
      await expect(submit).toBeEnabled();
    }

    await submit.click();

    // 상한 문구는 컴포넌트 로컬이라 export가 없다 — 리터럴 대신 "자격증명 문구가 아니다"로
    // 가른다(계약 4절). core 문구는 import해서 비교한다(하드코딩 금지).
    await expect(alert).not.toHaveText(authErrorMessage(INVALID_CREDENTIALS_MSG));
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText(LATIN);
    await page.waitForTimeout(500);
    expect(calls.urls).toHaveLength(5);
  });
});
