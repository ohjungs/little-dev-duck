import { defineConfig } from "vitest/config";
import path from "path";

// 2026-07-31 : 테스트 - 환경 - 파일단위jsdom승격규약
// environment는 "node"를 유지한다. web 테스트 573건 절대다수가 서버 라우트·순수 로직이라
// 전역 jsdom 전환은 (1) 무관한 테스트 전부에 DOM 부팅 비용을 물리고 (2) 서버 코드가 window를
// 봐서 분기하면 조용히 다른 경로를 타게 만든다. 그래서 전역 전환은 금지한다.
// **신규 렌더 테스트(React 컴포넌트 render)는 파일 첫 줄에 `// @vitest-environment jsdom`
// 한 줄을 넣어 파일 단위로만 승격한다.** (예: src/components/__tests__/ConfirmDialog.test.tsx)
// vitest 4에서 environmentMatchGlobs는 제거됐고, test.projects는 렌더 테스트가 손에 꼽는
// 지금 단계에선 과하다. 렌더 테스트가 수십 개로 늘면 그때 projects 분리를 재검토한다.
// 이 주석이 렌더 테스트 환경 규약의 단일 출처다.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["e2e/**", "node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@ldd/core": path.resolve(__dirname, "../../packages/core/src"),
    },
  },
});
