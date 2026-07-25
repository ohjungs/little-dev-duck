import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
// 루트 설정은 next 앱에 자동 적용되지 않는다(여기 설정이 우선). 날짜 규칙은 웹에서 특히
// 많이 터졌으므로 같은 규칙을 명시적으로 가져다 쓴다 — 정의는 루트 한 곳에만 둔다.
import { noUtcDateSlice } from "../../eslint.config.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  noUtcDateSlice,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
