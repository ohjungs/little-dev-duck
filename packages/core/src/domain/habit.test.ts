import { describe, expect, it } from "vitest";
import { deriveHabitStreak, habitSchema } from "./habit";

describe("deriveHabitStreak", () => {
  it("체크가 없으면 0", () => {
    expect(deriveHabitStreak([], "2026-07-21")).toBe(0);
  });

  it("오늘 체크하면 1", () => {
    expect(deriveHabitStreak(["2026-07-21"], "2026-07-21")).toBe(1);
  });

  it("오늘+어제 연속이면 2", () => {
    expect(
      deriveHabitStreak(["2026-07-20", "2026-07-21"], "2026-07-21"),
    ).toBe(2);
  });

  it("어제까지만 체크(오늘 아직)여도 스트릭은 살아있다", () => {
    expect(deriveHabitStreak(["2026-07-20"], "2026-07-21")).toBe(1);
  });

  it("마지막 체크가 2일 전이면 끊겨 0", () => {
    expect(deriveHabitStreak(["2026-07-19"], "2026-07-21")).toBe(0);
  });

  it("중간에 빈 날이 있으면 최신에서 이어진 구간만 센다", () => {
    // 21,20 연속 후 18(19 빔) → 오늘 기준 스트릭 2
    expect(
      deriveHabitStreak(["2026-07-18", "2026-07-20", "2026-07-21"], "2026-07-21"),
    ).toBe(2);
  });

  it("중복 날짜는 한 번만 센다", () => {
    expect(
      deriveHabitStreak(["2026-07-21", "2026-07-21", "2026-07-20"], "2026-07-21"),
    ).toBe(2);
  });

  it("월 경계를 넘어도 연속 계산", () => {
    expect(
      deriveHabitStreak(["2026-06-30", "2026-07-01"], "2026-07-01"),
    ).toBe(2);
  });
});

describe("habitSchema", () => {
  it("weekly는 timesPerWeek 1~7을 받는다", () => {
    const parsed = habitSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      title: "운동",
      frequency: "weekly",
      timesPerWeek: 3,
      createdAt: "2026-07-21T00:00:00+09:00",
      updatedAt: "2026-07-21T00:00:00+09:00",
    });
    expect(parsed.timesPerWeek).toBe(3);
  });
});
