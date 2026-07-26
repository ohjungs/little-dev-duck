import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { assertNoUnsafeStaticPages } from "./buildStaticGuard";

// 2026-07-26 : e2e - 검증신뢰성 - 낡은빌드차단
// playwright.config의 webServer는 `next start` — **미리 빌드된 결과물**을 서빙하는 프로덕션
// 서버라 hot reload가 없다. 그래서 `playwright test`를 단독으로 부르면 소스를 고쳐도 직전
// 빌드가 그대로 서빙된다. 실제로 겪었다(메타데이터를 고쳤는데 옛 값이 계속 나왔다).
//
// 위험한 쪽은 실패가 아니라 **조용한 거짓 통과**다 — 방금 깬 코드가 이전 빌드로 green이 된다.
// 규칙을 README에만 적어 두면 다음 사람이 그대로 밟으므로(lessons-learned L-13) 검사로 만든다.
//
// 이 검사가 실제로 잡는 건 **낡은 빌드** 한 가지다. 빌드가 아예 없는 경우는 `next start`가
// 먼저 자기 메시지로 막으므로("Could not find a production build") 아래 분기까지 오지 않는다
// — 실측으로 확인했다. 그 분기는 statSync 예외를 삼키기 위한 폴백으로만 남겨 둔다.

const WEB_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(WEB_ROOT, "..", "..");

// 빌드 결과물에 반영되는 것만 본다.
// - `public/`은 next start가 디스크에서 직접 서빙하므로 재빌드가 필요 없어 제외한다.
// - `e2e/`는 Next 빌드 산출물이 아니라 Playwright가 직접 읽으므로 제외한다
//   (스펙만 고쳤을 땐 재빌드 없이 돌려도 결과가 정확하다).
// - packages/*/src는 web 번들에 들어가므로 포함한다.
const WATCHED = [
  path.join(WEB_ROOT, "src"),
  path.join(WEB_ROOT, "next.config.ts"),
  path.join(REPO_ROOT, "packages"),
];

// packages 아래에서 소스만 본다 — dist/node_modules는 파생물이라 보면 오탐이 난다.
const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".turbo", "__tests__"]);
// 테스트 파일은 번들에 들어가지 않으므로 빌드 입력이 아니다. 세면 "테스트만 고쳤는데
// 빌드가 낡았다"는 헛경보가 나서 불필요한 재빌드를 시킨다.
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

type Newest = { file: string; mtimeMs: number } | null;

function newestIn(target: string): Newest {
  let stat;
  try {
    stat = statSync(target);
  } catch {
    return null; // 없는 경로는 조용히 넘긴다(패키지 구성이 바뀌어도 깨지지 않게).
  }

  if (stat.isFile()) {
    if (TEST_FILE.test(path.basename(target))) return null;
    return { file: target, mtimeMs: stat.mtimeMs };
  }

  let newest: Newest = null;
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const found = newestIn(path.join(target, entry.name));
    if (found && (!newest || found.mtimeMs > newest.mtimeMs)) newest = found;
  }
  return newest;
}

/** 빌드가 소스보다 낡았으면 사유 문자열, 최신이면 null. */
export function staleBuildReason(): string | null {
  const buildIdPath = path.join(WEB_ROOT, ".next", "BUILD_ID");
  let buildMtimeMs: number;
  try {
    buildMtimeMs = statSync(buildIdPath).mtimeMs;
  } catch {
    return "빌드 결과물(.next/BUILD_ID)이 없습니다.";
  }

  let newest: Newest = null;
  for (const target of WATCHED) {
    const found = newestIn(target);
    if (found && (!newest || found.mtimeMs > newest.mtimeMs)) newest = found;
  }
  if (!newest || newest.mtimeMs <= buildMtimeMs) return null;

  const rel = path.relative(REPO_ROOT, newest.file).replace(/\\/g, "/");
  const behindSec = Math.round((newest.mtimeMs - buildMtimeMs) / 1000);
  return `빌드가 소스보다 ${behindSec}초 낡았습니다. 가장 최근 변경: ${rel}`;
}

export default function globalSetup(): void {
  // 2026-07-26 (Phase 38): 빌드 산출물을 보는 검사가 하나 더 붙었다 — 정적으로 구워진 HTML
  // 페이지가 있으면 nonce CSP에 스크립트가 전부 막힌다. 여기가 빌드 직후에 도는 유일한 자리다.
  // 낡은 빌드를 먼저 거른 뒤에 봐야 의미가 있으므로 순서는 아래(staleBuildReason)가 먼저다.
  const reason = staleBuildReason();
  if (!reason) {
    assertNoUnsafeStaticPages(path.join(WEB_ROOT, ".next"));
    return;
  }
  throw new Error(
    [
      `e2e를 중단합니다 — ${reason}`,
      "",
      "webServer가 `next start`(미리 빌드된 결과물을 서빙)라, 이대로 돌리면 방금 고친",
      "코드가 아니라 **직전 빌드**가 검사됩니다. 통과해도 그 결과를 믿을 수 없습니다.",
      "",
      "  cd apps/web && pnpm e2e      (= next build && playwright test)",
      "",
      "스펙(e2e/)이나 문서만 고쳤다면 이 검사는 걸리지 않습니다.",
    ].join("\n"),
  );
}
