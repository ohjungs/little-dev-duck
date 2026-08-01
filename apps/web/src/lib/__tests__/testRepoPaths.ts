import path from "node:path";
import { fileURLToPath } from "node:url";

// 2026-08-01 : 테스트 - cwd 독립 경로 - 단일 출처
//
// 이 폴더의 "단일 출처 잠금" 테스트들은 소스 파일을 직접 읽어 텍스트를 검사한다.
// `join(process.cwd(), "src/...")` 형태로 짜면 apps/web에서 개별 실행할 때만 맞고,
// 저장소 루트에서 `pnpm coverage`로 통합 실행하면 cwd가 저장소 루트로 바뀌어
// 전부 ENOENT가 된다(vitest.coverage.config.ts는 루트에서 실행된다).
// 그래서 cwd가 아니라 **이 파일 자신의 위치**를 기준으로 apps/web 루트를 고정한다.
// 이 폴더의 모든 "단일 출처" 테스트는 이 헬퍼 하나로 경로를 계산한다 — 여기가 그 단일 출처다.
const WEB_ROOT = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../..",
);

/**
 * apps/web 기준 상대경로("src/...")나 그 상위("../../packages/...")를
 * 실행 위치(cwd)와 무관하게 절대경로로 바꾼다.
 */
export function resolveFromWebRoot(relPath: string): string {
  return path.resolve(WEB_ROOT, relPath);
}
