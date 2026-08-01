import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveFromWebRoot } from "./testRepoPaths";

// 2026-08-01 : 테스트 - e2e - CI요약 배선 계약 (단일 출처 잠금)
//
// reportSummary.test.ts는 buildSummaryMarkdown 순수 함수를, reportSummaryCli.test.ts는
// report-summary.mjs 실제 실행을 잠근다. 이 둘만으로는 "CI가 실제로 이 스크립트를
// 부르는지", "playwright.config.ts의 outputFile이 스크립트가 읽는 경로와 실제로 맞는지"는
// 검증되지 않는다 — 셋 다 개별로는 정상인데 배선(wiring)만 끊어져도 통과해 버린다.
// dependencyAuditIgnores.test.ts가 "허용 목록만 있고 감사가 안 돌면 장식이다"를 잠그는 것과
// 같은 이유로, 여기서는 리포터 설정 ↔ CI 스텝 ↔ 스크립트 경로 세 지점의 정합성을 잠근다.

const CI_YAML = resolveFromWebRoot("../../.github/workflows/ci.yml");
const PLAYWRIGHT_CONFIG = resolveFromWebRoot("playwright.config.ts");

describe("E2E 리포트 요약 CI 배선 계약", () => {
  it("playwright.config.ts가 json 리포터를 test-results/results.json으로 출력한다", () => {
    const text = readFileSync(PLAYWRIGHT_CONFIG, "utf8");
    // report-summary.mjs의 REPORT_PATH는 스크립트 위치(apps/web/e2e) 기준
    // "../test-results/results.json" — 즉 apps/web/test-results/results.json이다.
    // playwright.config.ts의 outputFile은 apps/web(cwd)을 기준으로 하는 상대경로이므로
    // 두 경로가 같은 파일을 가리키려면 정확히 "test-results/results.json"이어야 한다.
    expect(text).toMatch(/\["json",\s*\{\s*outputFile:\s*"test-results\/results\.json"\s*\}\]/);
  });

  it("ci.yml의 e2e 잡에 리포트 요약 스텝이 있고 e2e 실행 스텝 실패와 무관하게 돈다", () => {
    const ci = readFileSync(CI_YAML, "utf8");

    // e2e 잡 블록만 잘라낸다 — 다른 잡(lint-and-test, db-tests)에 같은 이름의 스텝이
    // 우연히 생겨도 오검출하지 않기 위해서다.
    const jobMatch = /\r?\n {2}e2e:\r?\n([\s\S]*?)(\r?\n {2}\S|$)/.exec(ci);
    expect(jobMatch, "ci.yml에 e2e 잡이 없습니다").not.toBeNull();
    const e2eJob = jobMatch![1];

    expect(e2eJob).toContain("pnpm --filter web e2e");
    expect(e2eJob).toContain("node apps/web/e2e/report-summary.mjs");

    // 요약 스텝이 if: always()로 걸려 있어야 e2e 실패 시에도 표가 남는다 — 이게 깨지면
    // "실패했을 때일수록 못 본다"는 원래 문제로 되돌아간다.
    const summaryStepMatch = /- name: E2E 결과 요약[\s\S]*?\r?\n {8}run: node apps\/web\/e2e\/report-summary\.mjs/.exec(
      e2eJob,
    );
    expect(summaryStepMatch, "E2E 결과 요약 스텝을 찾을 수 없습니다").not.toBeNull();
    expect(summaryStepMatch![0]).toContain("if: always()");
  });

  it("결과 요약 스텝은 e2e 실행 스텝보다 뒤에 온다 (순서 회귀 방지)", () => {
    const ci = readFileSync(CI_YAML, "utf8");
    const runIndex = ci.indexOf("pnpm --filter web e2e");
    const summaryIndex = ci.indexOf("node apps/web/e2e/report-summary.mjs");

    expect(runIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(runIndex);
  });
});
