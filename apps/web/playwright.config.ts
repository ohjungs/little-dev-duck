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
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // 개발 환경에서 Turbopack 최초 컴파일이 90초 넘게 걸리는 경우가 있어(특히 다른 dev 서버와
    // 리소스를 공유할 때) 기존 60초 기본값은 타임아웃으로 실패했다. 여유를 두고 120초로 상향.
    timeout: 120_000,
  },
});
