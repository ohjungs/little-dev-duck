import { describe, expect, it } from "vitest";
import { duckStateSchema } from "./duck-state";

const validDuckState = {
  userId: "22222222-2222-4222-8222-222222222222",
  xp: 120,
  level: 3,
  feed: 80,
  costume: "default",
  updatedAt: "2026-07-20T00:00:00.000Z",
};

describe("duckStateSchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(duckStateSchema.safeParse(validDuckState).success).toBe(true);
  });

  it("범위(0~100)를 초과한 feed를 거부한다", () => {
    expect(
      duckStateSchema.safeParse({ ...validDuckState, feed: 101 }).success,
    ).toBe(false);
  });

  it("음수 xp를 거부한다", () => {
    expect(
      duckStateSchema.safeParse({ ...validDuckState, xp: -1 }).success,
    ).toBe(false);
  });

  it("잘못된 형식의 날짜를 거부한다", () => {
    expect(
      duckStateSchema.safeParse({ ...validDuckState, updatedAt: "2026/07/20" })
        .success,
    ).toBe(false);
  });
});
