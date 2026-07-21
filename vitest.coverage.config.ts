import { defineConfig } from "vitest/config";

// 커버리지 전용 루트 설정. 파일명이 vitest 자동 탐색 대상(vitest.config.*)이 아니라서
// 패키지별 `vitest run`(각 패키지엔 config 없음)이 이걸 상속하지 않는다 — turbo의 패키지별
// 테스트 격리를 깨지 않고, `pnpm coverage`로 전 패키지 통합 커버리지 수치만 뽑는다.
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
});
