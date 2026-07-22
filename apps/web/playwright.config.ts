import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
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
