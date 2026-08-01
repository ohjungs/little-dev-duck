#!/usr/bin/env node
// Playwright JSON 리포트를 읽어 GITHUB_STEP_SUMMARY에 통과/실패/스킵 건수 표를 남긴다.
//
// 2026-08-01 : e2e - 리포터 - CI요약
// CI에서 e2e 44건이 스킵되는지 실패하는지는 로그를 끝까지 열어 세기 전엔 한눈에 안 보인다.
// 결정적 집계(건수 세기)는 사람이나 LLM이 아니라 코드가 한다(HD-003).
// 의존성 없는 순수 node 스크립트 — scripts/check-secrets.mjs와 같은 관례.
//
//   node apps/web/e2e/report-summary.mjs
//
// 항상 종료코드 0 — 이 스크립트는 정보 제공용이지 게이트가 아니다. 실패 판정은
// `pnpm --filter web e2e` 스텝 자체의 종료코드가 이미 담당한다.
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 스크립트 자신의 위치 기준 상대경로로 읽는다 — CI 스텝의 실행 cwd(레포 루트)가
// playwright.config.ts의 outputFile 기준 cwd(apps/web)와 다르기 때문.
const REPORT_PATH = path.join(__dirname, "..", "test-results", "results.json");

function writeSummary(markdown) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (target) {
    appendFileSync(target, `${markdown}\n`);
  } else {
    console.log(markdown);
  }
}

// 결정적 집계(건수 세기 + 표 조립) — 순수 함수라 vitest가 fs/CLI 없이 직접
// import해 테스트할 수 있다. scripts/check-secrets.mjs의 scanText export와 같은 관례.
export function buildSummaryMarkdown(stats) {
  const expected = stats?.expected ?? 0;
  const unexpected = stats?.unexpected ?? 0;
  const skipped = stats?.skipped ?? 0;
  const flaky = stats?.flaky ?? 0;

  const lines = [
    "### E2E 결과 요약",
    "",
    "| 상태 | 건수 |",
    "|---|---|",
    `| 통과 | ${expected} |`,
    `| 실패 | ${unexpected} |`,
    `| 스킵 | ${skipped} |`,
    `| 불안정(flaky) | ${flaky} |`,
  ];

  if (skipped > 0) {
    lines.push(
      "",
      "스킵 건은 대부분 `E2E_AUTH_STATE_B64` 시크릿 미등록으로 인증 필요 스펙이 " +
        "건너뛰어진 것입니다 — `apps/web/e2e/README.md` 'CI에서 실행' 절 참고.",
    );
  }

  return lines.join("\n");
}

function main() {
  let raw;
  try {
    raw = readFileSync(REPORT_PATH, "utf8");
  } catch {
    // 빌드 실패 등으로 e2e 자체가 못 돈 경우 — 요약 스텝은 if: always()로 걸리므로
    // 방어적으로 처리한다. 에러로 죽지 않는다.
    writeSummary("### E2E 결과 요약\n\n리포트 없음 — e2e가 실행되지 못했습니다(빌드 실패 등).");
    return 0;
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    writeSummary("### E2E 결과 요약\n\n리포트 파싱 실패 — results.json이 올바른 JSON이 아닙니다.");
    return 0;
  }

  writeSummary(buildSummaryMarkdown(report.stats ?? {}));
  return 0;
}

// 테스트에서 import할 때는 실행하지 않는다.
if (process.argv[1] && process.argv[1].endsWith("report-summary.mjs")) {
  process.exit(main());
}
