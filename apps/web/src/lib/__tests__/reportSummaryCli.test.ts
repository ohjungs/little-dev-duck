import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveFromWebRoot } from "./testRepoPaths";

// 2026-08-01 : 테스트 - e2e - CI요약 스크립트 통합 테스트 (실제 CLI 실행)
//
// report-summary.mjs는 실행 위치(cwd)와 무관하게 스크립트 자신의 위치를 기준으로
// apps/web/test-results/results.json을 읽어야 한다는 게 이 라운드 핵심 계약이다
// (playwright.config.ts의 outputFile은 apps/web 기준, CI 스텝은 저장소 루트 기준으로
// 돈다). 순수 함수 단위 테스트(reportSummary.test.ts)로는 이 cwd 독립성과 실제 fs
// 읽기/GITHUB_STEP_SUMMARY 분기까지는 검증할 수 없어 실제 서브프로세스로 돌린다.
//
// 이 테스트는 apps/web/test-results/results.json(gitignore 대상, .gitignore에
// apps/web/test-results/ 추가됨)을 임시로 썼다가 각 테스트 후 정리한다.

const SCRIPT_PATH = resolveFromWebRoot("e2e/report-summary.mjs");
const REPORT_DIR = resolveFromWebRoot("test-results");
const REPORT_PATH = join(REPORT_DIR, "results.json");
const REPO_ROOT = resolveFromWebRoot("../..");

function runScript(cwd: string, githubStepSummaryPath?: string): string {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (githubStepSummaryPath) {
    env.GITHUB_STEP_SUMMARY = githubStepSummaryPath;
  } else {
    delete env.GITHUB_STEP_SUMMARY;
  }
  return execFileSync(process.execPath, [SCRIPT_PATH], {
    cwd,
    env,
    encoding: "utf8",
  });
}

describe("report-summary.mjs (실제 CLI)", () => {
  // 이 파일 밖에서 우연히 남은 results.json이 있으면 백업했다가 마지막에 복원한다 —
  // 로컬에서 playwright e2e를 방금 돌린 개발자 워크스페이스를 훼손하지 않기 위해.
  let backup: string | null = null;

  beforeEach(() => {
    backup = existsSync(REPORT_PATH) ? readFileSync(REPORT_PATH, "utf8") : null;
    if (existsSync(REPORT_PATH)) rmSync(REPORT_PATH);
  });

  afterEach(() => {
    if (existsSync(REPORT_PATH)) rmSync(REPORT_PATH);
    if (backup !== null) {
      mkdirSync(REPORT_DIR, { recursive: true });
      writeFileSync(REPORT_PATH, backup, "utf8");
    }
    backup = null;
  });

  it("리포트 파일이 없으면 '리포트 없음' 메시지를 찍고 종료코드 0", () => {
    const stdout = runScript(REPO_ROOT);
    expect(stdout).toContain("리포트 없음");
    // execFileSync가 예외 없이 반환했다는 것 자체가 종료코드 0임을 뜻한다.
  });

  it("results.json이 깨진 JSON이면 파싱 실패 메시지를 찍고 종료코드 0", () => {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(REPORT_PATH, "{ not valid json", "utf8");

    const stdout = runScript(REPO_ROOT);
    expect(stdout).toContain("리포트 파싱 실패");
  });

  it("정상 리포트면 GITHUB_STEP_SUMMARY 미설정 시 표를 stdout에 찍는다", () => {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(
      REPORT_PATH,
      JSON.stringify({ stats: { expected: 40, unexpected: 0, skipped: 4, flaky: 0 } }),
      "utf8",
    );

    const stdout = runScript(REPO_ROOT);
    expect(stdout).toContain("| 통과 | 40 |");
    expect(stdout).toContain("| 스킵 | 4 |");
  });

  it("정상 리포트면 GITHUB_STEP_SUMMARY 설정 시 그 파일에 표를 append하고 stdout엔 안 찍는다", () => {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(
      REPORT_PATH,
      JSON.stringify({ stats: { expected: 1, unexpected: 2, skipped: 0, flaky: 0 } }),
      "utf8",
    );

    const summaryDir = mkdtempSync(join(tmpdir(), "ldd-step-summary-"));
    const summaryFile = join(summaryDir, "summary.md");
    writeFileSync(summaryFile, "", "utf8"); // GITHUB_STEP_SUMMARY는 append 대상 파일이 이미 존재

    try {
      const stdout = runScript(REPO_ROOT, summaryFile);
      expect(stdout).toBe("");

      const summaryContent = readFileSync(summaryFile, "utf8");
      expect(summaryContent).toContain("| 통과 | 1 |");
      expect(summaryContent).toContain("| 실패 | 2 |");
    } finally {
      rmSync(summaryDir, { recursive: true, force: true });
    }
  });

  it("실행 cwd가 저장소 루트든 apps/web이든 같은 results.json을 찾는다 (cwd 독립성)", () => {
    mkdirSync(REPORT_DIR, { recursive: true });
    writeFileSync(
      REPORT_PATH,
      JSON.stringify({ stats: { expected: 7, unexpected: 0, skipped: 0, flaky: 0 } }),
      "utf8",
    );

    const fromRepoRoot = runScript(REPO_ROOT);
    const fromAppsWeb = runScript(resolveFromWebRoot("."));

    expect(fromRepoRoot).toContain("| 통과 | 7 |");
    expect(fromAppsWeb).toContain("| 통과 | 7 |");
  });
});
