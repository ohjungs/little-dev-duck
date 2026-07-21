import { describe, expect, it } from "vitest";
import { activityDailyEntrySchema, ACTIVITY_COUNT_MAX } from "./activity-daily";

describe("activityDailyEntrySchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(
      activityDailyEntrySchema.safeParse({
        date: "2026-07-21",
        source: "claude_code",
        count: 3,
      }).success,
    ).toBe(true);
  });

  it("github 소스도 허용한다", () => {
    expect(
      activityDailyEntrySchema.safeParse({
        date: "2026-07-21",
        source: "github",
        count: 1,
      }).success,
    ).toBe(true);
  });

  it("count 0을 허용한다", () => {
    expect(
      activityDailyEntrySchema.safeParse({
        date: "2026-07-21",
        source: "claude_code",
        count: 0,
      }).success,
    ).toBe(true);
  });

  it("정의되지 않은 source를 거부한다", () => {
    expect(
      activityDailyEntrySchema.safeParse({
        date: "2026-07-21",
        source: "notion",
        count: 1,
      }).success,
    ).toBe(false);
  });

  it("음수 count를 거부한다", () => {
    expect(
      activityDailyEntrySchema.safeParse({
        date: "2026-07-21",
        source: "claude_code",
        count: -1,
      }).success,
    ).toBe(false);
  });

  it("잘못된 형식의 날짜를 거부한다", () => {
    expect(
      activityDailyEntrySchema.safeParse({
        date: "not-a-date",
        source: "claude_code",
        count: 1,
      }).success,
    ).toBe(false);
  });

  it("상한을 넘는 count를 거부한다", () => {
    expect(
      activityDailyEntrySchema.safeParse({
        date: "2026-07-21",
        source: "claude_code",
        count: ACTIVITY_COUNT_MAX + 1,
      }).success,
    ).toBe(false);
  });
});
