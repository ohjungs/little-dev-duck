import { defineConfig } from "vitest/config";
import path from "path";

// 커버리지 전용 루트 설정. 파일명이 vitest 자동 탐색 대상(vitest.config.*)이 아니라서
// 패키지별 `vitest run`(각 패키지엔 config 없음)이 이걸 상속하지 않는다 — turbo의 패키지별
// 테스트 격리를 깨지 않고, `pnpm coverage`로 전 패키지 통합 커버리지 수치만 뽑는다.
// apps/web은 자체 vitest.config.ts(별칭 @, @ldd/core)를 갖지만 이 루트 설정은 그걸
// 상속하지 않으므로 동일한 별칭을 여기서도 정의한다 — apps/web/vitest.config.ts가
// 이 별칭 규약의 단일 출처이며, 이 파일은 경로만 루트 기준으로 재계산해 따른다.
export default defineConfig({
  test: {
    // globals: true는 apps/web/vitest.config.ts와 맞춘다 — 없으면 @testing-library/react의
    // 자동 cleanup(afterEach)이 전역 afterEach를 못 찾아 등록되지 않고, 같은 파일 안 여러
    // it()가 DOM을 누적시켜 "복수 요소 발견" 오류로 렌더 테스트가 무더기로 깨진다.
    globals: true,
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/web/src/**/*.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts", "apps/web/src/**/*.{ts,tsx}"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/index.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@ldd/core": path.resolve(__dirname, "packages/core/src"),
    },
  },
});
