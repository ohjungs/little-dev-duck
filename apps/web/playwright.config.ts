import { defineConfig } from "@playwright/test";

const PORT = 5100;

export default defineConfig({
  testDir: "./e2e",
  // webServer가 `next start`라 소스를 고쳐도 직전 빌드가 서빙된다 — 낡은 빌드로 도는 걸 막는다.
  // 상세 사유는 e2e/buildFreshness.ts.
  globalSetup: "./e2e/buildFreshness.ts",
  // 2026-07-31 : e2e - 데이터정리 - 프로덕션오염
  // e2e가 프로덕션 Supabase에 실계정으로 쓴다. 정리 단계가 없어 만들어진 행이 사용자 대시보드에
  // 그대로 남았다. 상세 사유는 e2e/cleanup.ts.
  globalTeardown: "./e2e/cleanup.ts",
  // 2026-07-31 : e2e - 병렬 - 계정공유
  // 모든 스펙이 **같은 사용자 계정 하나**를 공유한다. 병렬로 돌면 A가 만든 e2e-todo를 B의 목록
  // 단언이 보고, B의 삭제가 A의 대기를 깬다 — "따로 돌리면 통과, 전체로 돌리면 실패"(실측)의 원인이다.
  // 계정을 분리하기 전까지는 직렬이 정답이다. 실측 직렬 시간 11.3분.
  // 전용 테스트 프로젝트/로컬 스택이 생기면 되돌린다(backlog: e2e를 프로덕션에서 분리).
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
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
