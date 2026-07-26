import { describe, expect, it } from "vitest";
import {
  resolveDateRange,
  dateRangeDays,
  isWithinRange,
  DATE_RANGE_PRESETS,
  DATE_RANGE_LABELS,
} from "./date-range";

// 2026-07-27 : 통계 - 기간 조회 (2차 피드백 3-1, Phase 46 T2)
// 이 저장소는 **주간 경계가 하루 밀려 집계된 버그**를 겪었고 그 흔적이 eslint 규칙이다.
// 기간 계산은 하루 어긋나기가 가장 쉬운 자리라 경계를 전부 못박는다.

describe("기간 프리셋", () => {
  it("최근 7일은 오늘을 포함해 7일이다", () => {
    // 어제까지 7일로 잡으면 **오늘 한 일이 통계에 안 보인다** — 사용자가 가장 먼저 확인하는 게 그건데.
    const r = resolveDateRange("last7", "2026-07-27");
    expect(r).toEqual({ from: "2026-07-21", to: "2026-07-27" });
    expect(dateRangeDays(r)).toBe(7);
  });

  it("최근 30일·90일도 오늘 포함이다", () => {
    expect(dateRangeDays(resolveDateRange("last30", "2026-07-27"))).toBe(30);
    expect(dateRangeDays(resolveDateRange("last90", "2026-07-27"))).toBe(90);
  });

  it("월 경계를 넘어도 맞는다", () => {
    // 7일 전이 지난달인 경우 — 달의 길이를 직접 세면 여기서 틀린다.
    expect(resolveDateRange("last7", "2026-08-03").from).toBe("2026-07-28");
  });

  it("연 경계를 넘어도 맞는다", () => {
    expect(resolveDateRange("last7", "2026-01-03").from).toBe("2025-12-28");
  });

  it("윤년 2월을 지나도 맞는다", () => {
    // 2028-03-05에서 7일 전 = 2028-02-28 (2028은 윤년이라 2월이 29일까지).
    expect(resolveDateRange("last7", "2028-03-05").from).toBe("2028-02-28");
  });

  it("이번 달은 1일부터 오늘까지다 (아직 오지 않은 날은 넣지 않는다)", () => {
    // 월말까지 넣으면 분모가 커져 **평균이 실제보다 낮아 보인다.**
    expect(resolveDateRange("thisMonth", "2026-07-27")).toEqual({
      from: "2026-07-01",
      to: "2026-07-27",
    });
  });

  it("1일에 '이번 달'을 고르면 하루짜리 구간이다", () => {
    const r = resolveDateRange("thisMonth", "2026-07-01");
    expect(r).toEqual({ from: "2026-07-01", to: "2026-07-01" });
    expect(dateRangeDays(r)).toBe(1);
  });

  it("지난 달은 그 달 전체다", () => {
    expect(resolveDateRange("lastMonth", "2026-07-27")).toEqual({
      from: "2026-06-01",
      to: "2026-06-30",
    });
  });

  it("지난 달이 31일이어도 맞는다", () => {
    expect(resolveDateRange("lastMonth", "2026-09-15").to).toBe("2026-08-31");
  });

  it("지난 달이 2월이면 그 해의 실제 마지막 날이다 (윤년 포함)", () => {
    // 달 길이를 직접 세지 않고 "이번 달 1일의 하루 전"으로 구하는 이유가 이것이다.
    expect(resolveDateRange("lastMonth", "2026-03-10").to).toBe("2026-02-28");
    expect(resolveDateRange("lastMonth", "2028-03-10").to).toBe("2028-02-29");
  });

  it("1월에 '지난 달'은 작년 12월이다", () => {
    expect(resolveDateRange("lastMonth", "2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });

  it("모든 프리셋에 라벨이 있다", () => {
    // 라벨이 빠진 프리셋이 화면에 뜨면 빈 버튼이 된다.
    for (const p of DATE_RANGE_PRESETS) {
      expect(DATE_RANGE_LABELS[p]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("from은 항상 to보다 뒤가 아니다", () => {
    for (const p of DATE_RANGE_PRESETS) {
      const r = resolveDateRange(p, "2026-01-01");
      expect(r.from <= r.to, `${p}: ${r.from} > ${r.to}`).toBe(true);
    }
  });

  it("같은 입력에 같은 결과다 (순수 함수 — '지금'을 다시 구하지 않는다)", () => {
    // 여기서 new Date()를 쓰면 서버(UTC)와 화면(로컬)이 다른 날을 본다.
    expect(resolveDateRange("last30", "2026-07-27")).toEqual(
      resolveDateRange("last30", "2026-07-27"),
    );
  });
});

describe("구간 포함 판정", () => {
  const range = { from: "2026-07-21", to: "2026-07-27" };

  it("양 끝을 포함한다", () => {
    expect(isWithinRange("2026-07-21", range)).toBe(true);
    expect(isWithinRange("2026-07-27", range)).toBe(true);
  });

  it("바깥은 제외한다", () => {
    expect(isWithinRange("2026-07-20", range)).toBe(false);
    expect(isWithinRange("2026-07-28", range)).toBe(false);
  });

  it("타임스탬프를 넘겨도 날짜 부분만 본다", () => {
    // 저장값은 타임스탬프인 경우가 많다 — 호출부가 매번 자르게 하면 한 곳에서 빠뜨린다.
    expect(isWithinRange("2026-07-27T23:59:59.000Z", range)).toBe(true);
  });
});
