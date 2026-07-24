import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { timeAgo } from "../timeAgo";

function isoOffset(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-24T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("30초 전 → 방금 전", () => {
    expect(timeAgo(isoOffset(30_000))).toBe("방금 전");
  });

  it("59초 전 → 방금 전", () => {
    expect(timeAgo(isoOffset(59_999))).toBe("방금 전");
  });

  it("1분 전 → 1분 전", () => {
    expect(timeAgo(isoOffset(60_000))).toBe("1분 전");
  });

  it("5분 전 → 5분 전", () => {
    expect(timeAgo(isoOffset(5 * 60_000))).toBe("5분 전");
  });

  it("59분 전 → 59분 전", () => {
    expect(timeAgo(isoOffset(59 * 60_000))).toBe("59분 전");
  });

  it("1시간 전 → 1시간 전", () => {
    expect(timeAgo(isoOffset(60 * 60_000))).toBe("1시간 전");
  });

  it("3시간 전 → 3시간 전", () => {
    expect(timeAgo(isoOffset(3 * 60 * 60_000))).toBe("3시간 전");
  });

  it("1일 전 → 1일 전", () => {
    expect(timeAgo(isoOffset(24 * 60 * 60_000))).toBe("1일 전");
  });

  it("3일 전 → 3일 전", () => {
    expect(timeAgo(isoOffset(3 * 24 * 60 * 60_000))).toBe("3일 전");
  });

  it("6일 전 → 6일 전", () => {
    expect(timeAgo(isoOffset(6 * 24 * 60 * 60_000))).toBe("6일 전");
  });

  it("1주 전 → 1주 전", () => {
    expect(timeAgo(isoOffset(7 * 24 * 60 * 60_000))).toBe("1주 전");
  });

  it("3주 전 → 3주 전", () => {
    expect(timeAgo(isoOffset(21 * 24 * 60 * 60_000))).toBe("3주 전");
  });

  it("4주 이상 → ko-KR 날짜 문자열", () => {
    const result = timeAgo(isoOffset(28 * 24 * 60 * 60_000));
    // ko-KR 로케일: 2026. 6. 26. 형태 또는 유사
    expect(result).toMatch(/\d{4}/);
  });
});
