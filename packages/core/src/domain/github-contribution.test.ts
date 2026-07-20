import { describe, expect, it } from "vitest";
import { contributionDaySchema, contributionSummarySchema } from "./github-contribution";

describe("contributionDaySchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(
      contributionDaySchema.safeParse({ date: "2026-07-20", count: 3 })
        .success,
    ).toBe(true);
  });

  it("count 0을 허용한다", () => {
    expect(
      contributionDaySchema.safeParse({ date: "2026-07-20", count: 0 })
        .success,
    ).toBe(true);
  });

  it("음수 count를 거부한다", () => {
    expect(
      contributionDaySchema.safeParse({ date: "2026-07-20", count: -1 })
        .success,
    ).toBe(false);
  });

  it("잘못된 형식의 날짜를 거부한다", () => {
    expect(
      contributionDaySchema.safeParse({ date: "not-a-date", count: 1 })
        .success,
    ).toBe(false);
  });
});

describe("contributionSummarySchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(
      contributionSummarySchema.safeParse({
        totalCount: 2,
        days: [
          { date: "2026-07-19", count: 1 },
          { date: "2026-07-20", count: 1 },
        ],
      }).success,
    ).toBe(true);
  });

  it("빈 days 배열을 허용한다", () => {
    expect(
      contributionSummarySchema.safeParse({ totalCount: 0, days: [] })
        .success,
    ).toBe(true);
  });

  it("음수 totalCount를 거부한다", () => {
    expect(
      contributionSummarySchema.safeParse({ totalCount: -1, days: [] })
        .success,
    ).toBe(false);
  });
});
