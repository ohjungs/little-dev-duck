import { describe, expect, it } from "vitest";
import { isQuietHour } from "./quiet-hours";

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
