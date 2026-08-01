import { describe, expect, it } from "vitest";
import { buildSummaryMarkdown } from "../../../e2e/report-summary.mjs";

// 2026-08-01 : 테스트 - e2e - CI요약 표 조립 (HD-003 결정적 집계 단위 테스트)
// GITHUB_STEP_SUMMARY에 찍히는 표는 결정적 집계라 사람이 로그를 세지 않아도 되게 하는 게
// 목적이다 — 그 집계 로직(buildSummaryMarkdown)이 정확한지를 fs/CLI 없이 직접 잠근다.
// scripts/check-secrets.mjs가 scanText를 export해 packages/core에서 직접 테스트하는
// 것과 같은 관례.

describe("buildSummaryMarkdown", () => {
  it("통과/실패/스킵/불안정 건수를 표로 조립한다", () => {
    const md = buildSummaryMarkdown({
      expected: 40,
      unexpected: 2,
      skipped: 4,
      flaky: 1,
    });

    expect(md).toContain("| 통과 | 40 |");
    expect(md).toContain("| 실패 | 2 |");
    expect(md).toContain("| 스킵 | 4 |");
    expect(md).toContain("| 불안정(flaky) | 1 |");
  });

  it("stats 필드가 없으면 0으로 취급한다 (undefined 오염 방지)", () => {
    const md = buildSummaryMarkdown({});

    expect(md).toContain("| 통과 | 0 |");
    expect(md).toContain("| 실패 | 0 |");
    expect(md).toContain("| 스킵 | 0 |");
    expect(md).toContain("| 불안정(flaky) | 0 |");
  });

  it("stats 자체가 null/undefined여도 죽지 않고 0으로 취급한다", () => {
    // JSON.parse(raw).stats가 없을 수 있다 — main()은 항상 report.stats ?? {}를 넘기지만
    // 이 함수 자신도 방어적이어야 한다(옵셔널 체이닝 회귀 방지).
    expect(buildSummaryMarkdown(undefined)).toContain("| 통과 | 0 |");
    expect(buildSummaryMarkdown(null)).toContain("| 통과 | 0 |");
  });

  it("스킵이 0건이면 인증 시크릿 안내 문구를 붙이지 않는다", () => {
    const md = buildSummaryMarkdown({ expected: 10, unexpected: 0, skipped: 0, flaky: 0 });
    expect(md).not.toContain("E2E_AUTH_STATE_B64");
  });

  it("스킵이 1건 이상이면 인증 시크릿 안내 문구를 붙인다", () => {
    const md = buildSummaryMarkdown({ expected: 10, unexpected: 0, skipped: 1, flaky: 0 });
    expect(md).toContain("E2E_AUTH_STATE_B64");
    expect(md).toContain("apps/web/e2e/README.md");
  });

  it("음수 카운트가 들어와도 표를 깨지 않고 그대로 반영한다 (negative-overflow 렌즈)", () => {
    // Playwright 리포터가 이런 값을 낼 리는 없지만, 방어적 함수라 입력을 검열하지 않는다는
    // 계약을 명시적으로 잠근다 — 값 자체를 신뢰하고 표시만 담당한다.
    const md = buildSummaryMarkdown({ expected: -1, unexpected: 0, skipped: 0, flaky: 0 });
    expect(md).toContain("| 통과 | -1 |");
  });

  it("표 헤더와 구조가 고정돼 있다 (CI 화면 렌더 회귀 방지)", () => {
    const md = buildSummaryMarkdown({ expected: 1, unexpected: 0, skipped: 0, flaky: 0 });
    const lines = md.split("\n");
    expect(lines[0]).toBe("### E2E 결과 요약");
    expect(lines[2]).toBe("| 상태 | 건수 |");
    expect(lines[3]).toBe("|---|---|");
  });
});
