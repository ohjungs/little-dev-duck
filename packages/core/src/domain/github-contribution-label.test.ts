import { describe, expect, it } from "vitest";
import { contributionGridLabel } from "./github-contribution-label";

// 2026-07-30 : 접근성 - GitHub 잔디 - 대체 텍스트 (감사 발견)
// 잔디는 순수 div 격자에 마우스용 title만 있어 스크린리더 사용자에게 **아무것도 전달되지
// 않았다**. 셀 365개를 하나씩 읽히는 건 도움이 아니라 방해라, 데이터 시각화의 표준 기법대로
// 격자 전체를 role="img" + 요약 문구 하나로 대체한다. 문구는 여기서 순수하게 만든다 —
// JSX 안에 문자열을 조립하면 검사할 수 없다.

const day = (date: string, count: number) => ({ date, count });

describe("contributionGridLabel", () => {
  it("총 개수와 기여한 날 수를 문구에 담는다", () => {
    const label = contributionGridLabel({
      totalCount: 5,
      days: [day("2026-07-28", 2), day("2026-07-29", 0), day("2026-07-30", 3)],
    });
    expect(label).toContain("5개");
    expect(label).toContain("2일"); // 기여가 있는 날은 2일
  });

  it("가장 많이 기여한 날과 그 개수를 알려준다", () => {
    const label = contributionGridLabel({
      totalCount: 9,
      days: [day("2026-07-28", 2), day("2026-07-29", 7)],
    });
    expect(label).toContain("2026-07-29");
    expect(label).toContain("7개");
  });

  it("동일 최대치가 여럿이면 가장 이른 날을 고른다", () => {
    // 임의로 흔들리면 같은 데이터에 다른 문구가 나와 스크린리더 사용자가 혼란스럽다.
    // 두 날짜 모두 기간 표시("A부터 B까지")에 등장하므로 **최대치 구절만** 겨냥해 단정한다
    // (전체 문자열에 not.toContain을 쓰면 기간 표시에 걸려 구현이 맞는데도 실패한다).
    const label = contributionGridLabel({
      totalCount: 6,
      days: [day("2026-07-28", 3), day("2026-07-29", 3)],
    });
    expect(label).toContain("가장 많이 기여한 날은 2026-07-28 3개");
  });

  it("기여가 하나도 없으면 최대치를 언급하지 않는다", () => {
    // "가장 많이 기여한 날: 0개"는 정보가 아니라 잡음이다.
    const label = contributionGridLabel({
      totalCount: 0,
      days: [day("2026-07-29", 0), day("2026-07-30", 0)],
    });
    expect(label).toContain("아직 없");
    expect(label).not.toContain("가장");
  });

  it("빈 날짜 목록에도 문구를 만든다 (터지지 않는다)", () => {
    // 경계값: 연동 직후 등 days가 빈 배열로 오는 경우.
    expect(contributionGridLabel({ totalCount: 0, days: [] })).toContain("아직 없");
  });

  it("기간을 첫 날~마지막 날로 알려준다", () => {
    const label = contributionGridLabel({
      totalCount: 1,
      days: [day("2025-08-01", 0), day("2026-07-30", 1)],
    });
    expect(label).toContain("2025-08-01");
    expect(label).toContain("2026-07-30");
  });
});
