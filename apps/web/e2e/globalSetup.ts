import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import assertFreshBuild from "./buildFreshness";
// authState(판정 모듈)는 **일부러 부르지 않는다** — 불러오는 순간 세션을 만들기 전의 판정이
// 캐시에 굳어 스펙까지 그 값을 본다. 사유는 authStatePath.ts.
import { AUTH_STATE_PATH } from "./authStatePath";

// 2026-07-31 : e2e - 인증세션 - 스스로 로그인 (사용자 질문에서 출발)
// 지금까지 로그인 뒤 화면 스펙 44건은 **사람이 브라우저로 OAuth를 마치고 세션 파일을 저장해
// 줘야** 돌았다. 그 파일이 만료될 때마다 전부 스킵되거나 리다이렉트로 죽었다 —
// 이 저장소가 며칠째 "테스트는 통과했지만 화면은 못 봤다"를 반복한 단일 원인이다.
//
// **이메일 로그인이 이미 켜져 있다는 것을 확인해 그 고리를 끊는다**(실측: /auth/v1/settings의
// external.email = true). 전용 테스트 계정의 이메일·비밀번호가 있으면 여기서 브라우저를 띄워
// **실제 로그인 화면을 통과**해 세션을 만든다. 사람 손이 필요 없다.
//
// 왜 쿠키를 직접 굽지 않는가: @supabase/ssr의 쿠키 이름·인코딩·분할 규칙은 버전에 딸린
// 내부 규약이다. 손으로 흉내 내면 라이브러리가 올라갈 때 조용히 어긋난다. 실제 폼을 통과하면
// **앱이 쿠키를 굽는다** — 형식이 바뀌어도 따라온다. 덤으로 로그인 경로 자체를 매번 검증한다.
//
// 자격증명이 없으면 아무것도 하지 않는다(예전과 똑같이 스펙이 스킵된다). CI에서 시크릿을
// 안 넣은 사람에게 실패로 보이면 안 된다 — 안전한 기본값은 "조용히 예전 동작".

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5100";

async function mintAuthState(baseURL: string): Promise<void> {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    console.log(
      "[e2e] E2E_EMAIL/E2E_PASSWORD가 없어 세션을 만들지 않습니다 — 인증 스펙은 스킵됩니다.",
    );
    return;
  }

  mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto("/login");

    // 로그인 탭이 기본이다. 가입 탭이 선택돼 있으면 같은 폼이 계정을 만들려 든다.
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole("button", { name: "이메일로 로그인" }).click();

    // 성공하면 앱이 '/'로 전체 이동한다. 실패는 폼에 그대로 머문다 —
    // 여기서 조용히 넘어가면 그 뒤 44건이 전부 리다이렉트로 죽어 원인을 다시 찾게 된다.
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    });

    // 전용 테스트 계정은 늘 **처음 들어온 사용자**라 온보딩 오버레이가 뜬다. 그게 화면을 덮고
    // 있으면 대시보드를 만지는 스펙이 전부 클릭 가로채기로 죽는다 — 세션과 함께 꺼 둔다.
    // 키는 src/lib/onboarding.ts의 것과 같아야 한다(바뀌면 오버레이가 다시 뜬다).
    await page.evaluate(() => window.localStorage.setItem("ldd:onboarded", "1"));

    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`[e2e] 인증 세션을 새로 만들었습니다 → ${AUTH_STATE_PATH}`);
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(): Promise<void> {
  // 배포된 사이트를 겨냥할 때는 로컬 빌드 신선도를 볼 이유가 없다 —
  // 그 서버가 서빙하는 것은 우리가 방금 만든 빌드가 아니라 Vercel이 만든 것이다.
  if (!process.env.E2E_BASE_URL) assertFreshBuild();

  // **매번 새로 만든다.** "살아 있으면 건너뛴다"로 아끼는 건 로그인 왕복 3초뿐인데, 그 판단이
  // 틀리는 경우를 실제로 겪었다 — 쿠키 만료일은 2027년인데 안에 든 토큰은 이미 죽어서
  // 파일 검사로는 "쓸 수 있음"인데 실제로는 /welcome으로 튕겼다. 파일만 보고 알 수 없는 것을
  // 추측하지 않는다. 자격증명이 없으면 mintAuthState가 아무것도 하지 않고 예전 동작으로 돌아간다.
  await mintAuthState(BASE_URL);
}
