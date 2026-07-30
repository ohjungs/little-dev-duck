// 2026-07-30 : e2e - 인증세션 - 프로덕션세션을 로컬용으로 변환
//
// 왜 필요한가: `redirectTo`는 `window.location.origin`(LoginForm.tsx)인데 Supabase 리다이렉트
// 허용목록에 `http://localhost:5100`이 없으면 Supabase가 Site URL(프로덕션)로 되돌린다.
// 그래서 로컬에서 로그인해도 쿠키가 프로덕션 도메인에 붙고 세션 파일은 빈 채로 저장된다.
//
// 왜 이게 성립하는가: Supabase 인증 쿠키는 **Supabase가 서명한 JWT**라서 origin에 묶이지 않는다.
// 도메인만 바꿔 주면 로컬 앱이 같은 세션으로 인증된다. 허용목록을 못 바꿀 때의 우회로다
// (바꿀 수 있으면 README 본절의 직접 생성이 더 낫다 — 변환 단계가 없다).
//
// 온보딩 플래그를 함께 심는 것이 **필수**다: `ldd:onboarded`가 없으면 "시작 안내" 오버레이가
// 클릭을 가로채 위젯 스펙이 전부 실패한다. `authState.ts`는 인증 쿠키만 보고 usable을 판정하므로
// 이 경우를 걸러 주지 못한다 — 세션 파일을 새로 만든 누구에게나 일어난다.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const DIR = path.join(import.meta.dirname, ".auth");
const SRC = process.argv[2] ?? path.join(DIR, "prod.json");
const DEST = process.argv[3] ?? path.join(DIR, "user.json");
// playwright.config.ts의 PORT와 같아야 한다. localStorage는 origin 단위로 저장되므로
// 포트가 다르면 온보딩 플래그가 적용되지 않는다.
const ORIGIN = process.env.E2E_ORIGIN ?? "http://localhost:5100";

if (!existsSync(SRC)) {
  console.error(
    `원본 세션이 없습니다: ${SRC}\n` +
      `먼저 프로덕션에서 세션을 받으세요:\n` +
      `  pnpm --filter web exec playwright open <프로덕션 URL>/login --save-storage=e2e/.auth/prod.json`,
  );
  process.exit(1);
}

const src = JSON.parse(readFileSync(SRC, "utf8"));
// Supabase 인증 쿠키만 옮긴다. 나머지(google·github 로그인 흔적)는 우리 앱 인증과 무관하고,
// 남겨 두면 세션 파일에 불필요한 외부 서비스 토큰이 들어간다.
const auth = (src.cookies ?? []).filter(
  (c) => typeof c.name === "string" && c.name.startsWith("sb-") && c.name.includes("auth-token"),
);

if (auth.length === 0) {
  console.error(
    `원본에 Supabase 인증 쿠키가 없습니다 — 로그인을 마치기 전에 창을 닫았을 수 있습니다.\n` +
      `창을 닫는 시점에 파일이 쓰이므로, 로그인 완료 후 창을 닫아야 합니다.`,
  );
  process.exit(1);
}

const cookies = auth.map((c) => ({
  ...c,
  domain: "localhost",
  path: "/",
  // localhost는 http라 secure 쿠키는 전송되지 않는다.
  secure: false,
  sameSite: "Lax",
}));

writeFileSync(
  DEST,
  JSON.stringify(
    {
      cookies,
      origins: [{ origin: ORIGIN, localStorage: [{ name: "ldd:onboarded", value: "1" }] }],
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`${DEST} 생성 — 인증 쿠키 ${cookies.length}개, origin ${ORIGIN}`);
console.log(`확인: pnpm --filter web exec playwright test widgets.spec.ts`);
