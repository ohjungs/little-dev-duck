import { defineConfig } from "vitest/config";

// 2026-07-31 : 테스트 - 환경 - jsdom전역채택
// @ldd/ui는 렌더 테스트(Toast.test.tsx)와 순수 로직 테스트(tokens.test.ts)만 있고 노드 전용
// 테스트가 없다. 그래서 apps/web과 달리 파일 단위 승격이 아니라 패키지 전역 jsdom으로 둔다.
//
// 2026-07-31 : 테스트 - 설정 - globals목적한정
// globals: true의 유일한 목적은 @testing-library/react의 자동 afterEach(cleanup) 등록이다
// (RTL은 globalThis.afterEach가 있을 때만 self-cleanup을 건다). 테스트 파일은 그럼에도
// describe/it/expect/vi를 명시 import 한다 — tokens.test.ts 관행이고, 그래야 tsconfig에
// types: ["vitest/globals"]를 넣지 않아도 된다(tsconfig 무변경 유지).
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
});
