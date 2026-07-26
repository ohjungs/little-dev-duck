import { describe, expect, it } from "vitest";
import { buildBarChart, describeBarChart } from "./bar-chart";

// 2026-07-27 : 통계 - 차트 (2차 피드백 3-1, Phase 46 T1)
// 라이브러리를 안 쓰기로 한 대신 **축·막대 계산이 우리 책임**이다. 0으로 나누기와 빈 데이터가
// 가장 쉽게 깨지는 자리라 먼저 잠근다.

describe("막대 그래프 계산", () => {
  it("최댓값을 보기 좋은 수로 올린다", () => {
    // 축이 7·13 같은 어중간한 수로 끝나면 읽는 사람이 눈금을 계산해야 한다.
    expect(buildBarChart([{ label: "a", value: 7 }]).max).toBe(10);
    expect(buildBarChart([{ label: "a", value: 3 }]).max).toBe(5);
    expect(buildBarChart([{ label: "a", value: 11 }]).max).toBe(20);
    expect(buildBarChart([{ label: "a", value: 1 }]).max).toBe(1);
  });

  it("값이 전부 0이어도 0으로 나누지 않는다", () => {
    const s = buildBarChart([{ label: "a", value: 0 }, { label: "b", value: 0 }]);
    expect(s.max).toBe(1);
    expect(s.bars.every((b) => b.ratio === 0)).toBe(true);
  });

  it("데이터가 없어도 던지지 않는다", () => {
    const s = buildBarChart([]);
    expect(s.bars).toEqual([]);
    expect(s.max).toBeGreaterThan(0);
  });

  it("비율은 0~1 안에 있다", () => {
    const s = buildBarChart([
      { label: "a", value: 1 },
      { label: "b", value: 9 },
    ]);
    for (const b of s.bars) {
      expect(b.ratio).toBeGreaterThanOrEqual(0);
      expect(b.ratio).toBeLessThanOrEqual(1);
    }
  });

  it("음수는 0으로 본다 (아래로 뻗는 막대를 그리지 않는다)", () => {
    // 카운트에 음수가 오는 건 상류 결함이다. 그럴듯하게 그리면 그 결함이 숨는다.
    const s = buildBarChart([{ label: "a", value: -5 }]);
    expect(s.bars[0].ratio).toBe(0);
    expect(s.bars[0].point.value).toBe(0);
  });

  it("NaN·Infinity도 0으로 본다", () => {
    const s = buildBarChart([
      { label: "a", value: NaN },
      { label: "b", value: Infinity },
    ]);
    expect(s.bars.every((b) => b.ratio === 0)).toBe(true);
  });

  it("눈금은 0을 포함하고 오름차순이며 겹치지 않는다", () => {
    const s = buildBarChart([{ label: "a", value: 10 }], 3);
    expect(s.ticks[0]).toBe(0);
    expect([...s.ticks].sort((a, b) => a - b)).toEqual(s.ticks);
    expect(new Set(s.ticks).size).toBe(s.ticks.length);
  });

  it("최댓값이 작아 눈금이 겹칠 때도 중복이 없다", () => {
    // max=1에 눈금 3개를 요구하면 0·0·1·1이 나온다 — 그대로 그리면 선이 겹쳐 보인다.
    const s = buildBarChart([{ label: "a", value: 1 }], 3);
    expect(new Set(s.ticks).size).toBe(s.ticks.length);
  });

  it("입력 순서를 유지한다 (날짜 순서가 곧 x축이다)", () => {
    const s = buildBarChart([
      { label: "1일", value: 1 },
      { label: "2일", value: 2 },
      { label: "3일", value: 3 },
    ]);
    expect(s.bars.map((b) => b.point.label)).toEqual(["1일", "2일", "3일"]);
  });
});

describe("차트 요약 문구", () => {
  it("합계와 최고 구간을 말한다", () => {
    // 그림만 있는 차트는 보조기기에 아무 정보도 아니다.
    const s = buildBarChart([
      { label: "월", value: 2 },
      { label: "화", value: 5 },
    ]);
    const text = describeBarChart(s);
    expect(text).toContain("합계 7회");
    expect(text).toContain("화");
  });

  it("데이터가 없으면 없다고 말한다", () => {
    expect(describeBarChart(buildBarChart([]))).toContain("없습니다");
  });
});
