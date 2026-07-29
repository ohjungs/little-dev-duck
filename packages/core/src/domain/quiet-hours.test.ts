import { describe, expect, it } from "vitest";
import { isQuietHour, isQuietNow } from "./quiet-hours";

describe("isQuietHour", () => {
  it("정상 구간(start<end): [9,18)만 조용", () => {
    expect(isQuietHour(8, 9, 18)).toBe(false);
    expect(isQuietHour(9, 9, 18)).toBe(true);
    expect(isQuietHour(17, 9, 18)).toBe(true);
    expect(isQuietHour(18, 9, 18)).toBe(false);
  });

  it("자정 넘김(start>end): 22시~7시 조용", () => {
    expect(isQuietHour(22, 22, 7)).toBe(true);
    expect(isQuietHour(23, 22, 7)).toBe(true);
    expect(isQuietHour(0, 22, 7)).toBe(true);
    expect(isQuietHour(6, 22, 7)).toBe(true);
    expect(isQuietHour(7, 22, 7)).toBe(false);
    expect(isQuietHour(12, 22, 7)).toBe(false);
  });

  it("start===end는 빈 구간(항상 false)", () => {
    expect(isQuietHour(0, 0, 0)).toBe(false);
    expect(isQuietHour(12, 9, 9)).toBe(false);
  });
});

// 2026-07-29 : 방해금지 - 요일별 (Phase 56 T1 M-011)
describe("isQuietNow", () => {
  const pref = { start: 22, end: 7 };

  it("days가 없으면 매일 — 기존 설정(하위호환) 그대로 동작한다", () => {
    expect(isQuietNow({ hour: 23, weekday: 3 }, pref)).toBe(true);
    expect(isQuietNow({ hour: 12, weekday: 3 }, pref)).toBe(false);
  });

  it("days가 있으면 그 요일에만 조용하다", () => {
    const weekdaysOnly = { ...pref, days: [1, 2, 3, 4, 5] };
    expect(isQuietNow({ hour: 23, weekday: 1 }, weekdaysOnly)).toBe(true);
    expect(isQuietNow({ hour: 23, weekday: 0 }, weekdaysOnly)).toBe(false);
  });

  it("빈 days는 어떤 요일도 아니다 (항상 시끄러움 — 설정 화면이 경고할 상태)", () => {
    expect(isQuietNow({ hour: 23, weekday: 3 }, { ...pref, days: [] })).toBe(false);
  });

  it("자정을 넘는 구간의 요일 판정은 지금 요일 기준이다 (월요일만 설정 시 화요일 새벽은 시끄러움)", () => {
    // 22~07 구간에서 월(1)만 조용으로 설정 — 화요일 01시는 '화요일'이므로 조용하지 않다.
    // "월요일 밤부터 이어지는 새벽"까지 원하면 화요일도 함께 켜면 된다(단순한 규칙이 낫다).
    const mondayOnly = { ...pref, days: [1] };
    expect(isQuietNow({ hour: 23, weekday: 1 }, mondayOnly)).toBe(true);
    expect(isQuietNow({ hour: 1, weekday: 2 }, mondayOnly)).toBe(false);
  });
});
