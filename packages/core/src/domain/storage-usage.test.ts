import { describe, expect, it } from "vitest";
import {
  STORAGE_FREE_TIER_BYTES,
  formatBytes,
  storageUsagePercent,
} from "./storage-usage";

// 2026-07-29 : 메신저 - 저장 공간 사용량 (Phase 55 T2 Q-022)
describe("formatBytes", () => {
  it("단위 경계를 넘긴다 (1024 기준)", () => {
    expect(formatBytes(0)).toBe("0B");
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(1024)).toBe("1.0KB");
    expect(formatBytes(1536)).toBe("1.5KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0MB");
    expect(formatBytes(1024 ** 3)).toBe("1.0GB");
  });

  it("음수·비정상 입력은 0B (표시용이라 던지지 않는다)", () => {
    expect(formatBytes(-5)).toBe("0B");
    expect(formatBytes(Number.NaN)).toBe("0B");
  });
});

describe("storageUsagePercent", () => {
  it("무료 티어 1GB 기준 백분율 (소수 1자리)", () => {
    expect(STORAGE_FREE_TIER_BYTES).toBe(1024 ** 3);
    expect(storageUsagePercent(0)).toBe(0);
    expect(storageUsagePercent(STORAGE_FREE_TIER_BYTES / 2)).toBe(50);
    expect(storageUsagePercent(STORAGE_FREE_TIER_BYTES / 4)).toBe(25);
  });

  it("한도를 넘으면 100을 넘겨 그대로 보여준다 (자르면 초과를 숨긴다)", () => {
    expect(storageUsagePercent(STORAGE_FREE_TIER_BYTES * 1.5)).toBe(150);
  });

  it("아주 작은 사용량도 0으로 뭉개지 않는다", () => {
    // 3MB ≈ 0.3% — "0%"로 보이면 쓴 게 없다고 오인한다.
    expect(storageUsagePercent(3 * 1024 * 1024)).toBeCloseTo(0.3, 1);
  });
});
