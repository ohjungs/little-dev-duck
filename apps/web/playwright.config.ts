import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const PORT = 5100;

// 2026-07-31 : e2e - 환경변수 - .env.local 읽기
// Next는 앱을 띄울 때 .env.local을 알아서 읽지만, **Playwright를 띄우는 이 프로세스는 아니다.**
// globalSetup이 전용 테스트 계정으로 스스로 로그인하려면 그 값이 여기 있어야 한다.
// dotenv를 새로 들이지 않는다 — 우리가 쓰는 형태는 `KEY=값` 한 줄이 전부다(ponytail).
// 이미 있는 환경변수는 덮어쓰지 않는다: CI 시크릿이 파일보다 앞선다.
function loadEnvLocal(): void {
  let text: string;
  try {
    text = readFileSync(path.join(__dirname, ".env.local"), "utf8");
  } catch {
    return; // 파일이 없는 환경(CI)에서는 조용히 넘어간다.
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadEnvLocal();

// 2026-07-31 : e2e - 대상 - 배포된 사이트 겨냥 (사용자 질문)
// 기본은 지금까지처럼 로컬 빌드다. `E2E_BASE_URL`을 주면 **이미 배포된 사이트**를 그대로 친다 —
// "코드는 통과했는데 실제 배포본은?"을 확인할 수 있는 유일한 경로다.
// 그때는 우리가 서버를 띄우지 않는다(webServer 없음). 남의 서버를 우리 빌드로 판정하는
// buildFreshness 검사도 의미가 없어 globalSetup이 건너뛴다.
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const USE_DEPLOYED = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  // 빌드 신선도 확인 + 세션이 없으면 전용 계정으로 스스로 로그인. 상세 사유는 e2e/globalSetup.ts.
  globalSetup: "./e2e/globalSetup.ts",
  // 2026-07-31 : e2e - 데이터정리 - 프로덕션오염
  // e2e가 프로덕션 Supabase에 실계정으로 쓴다. 정리 단계가 없어 만들어진 행이 사용자 대시보드에
  // 그대로 남았다. 상세 사유는 e2e/cleanup.ts.
  globalTeardown: "./e2e/cleanup.ts",
  // 2026-07-31 : e2e - 병렬 - 계정공유
  // 모든 스펙이 **같은 사용자 계정 하나**를 공유한다. 병렬로 돌면 A가 만든 e2e-todo를 B의 목록
  // 단언이 보고, B의 삭제가 A의 대기를 깬다 — "따로 돌리면 통과, 전체로 돌리면 실패"(실측)의 원인이다.
  // 계정을 분리하기 전까지는 직렬이 정답이다. 실측 직렬 시간 11.3분.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  // 배포본을 칠 때는 서버를 띄우지 않는다. 띄우면 로컬 빌드가 함께 도는데 아무도 안 쓴다.
  webServer: USE_DEPLOYED
    ? undefined
    : {
        // dev 서버(`next dev`)는 요청 시점에 라우트를 Turbopack으로 컴파일하는데, 이 최초 컴파일이 느린
        // 머신(부하·큰 의존성 그래프)에서 webServer 준비 타임아웃(구 120초)을 넘겨 매 실행이 실패했다.
        // 프로덕션 서버(`next start`)는 요청 시 컴파일이 없어 즉시 응답하므로 머신 속도와 무관하게 안정적이다.
        // 빌드는 e2e 스크립트(`next build && playwright test`)가 먼저 수행하므로 여기선 start만 띄운다.
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        // next start는 즉시 바인딩되지만, 방금 끝난 빌드로 부하가 남아 있을 수 있어 여유를 둔다.
        timeout: 120_000,
      },
});
