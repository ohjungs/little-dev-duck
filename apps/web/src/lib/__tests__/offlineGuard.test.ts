import { describe, expect, it } from "vitest";
import { isOffline, OFFLINE_SEND_MESSAGE } from "../offlineGuard";

// 2026-07-29 : 메신저 - 오프라인 전송 차단 (Phase 57 T2 W-013)
describe("isOffline", () => {
  it("onLine=false일 때만 참", () => {
    expect(isOffline({ onLine: false })).toBe(true);
    expect(isOffline({ onLine: true })).toBe(false);
  });

  it("navigator가 없는 환경(SSR·node)에서는 막지 않는다", () => {
    expect(isOffline()).toBe(false);
    expect(isOffline(null)).toBe(false);
  });
});

describe("OFFLINE_SEND_MESSAGE", () => {
  it("초안이 남아 있음을 말한다 (지워진 줄 알면 다시 쓴다)", () => {
    expect(OFFLINE_SEND_MESSAGE).toContain("남아 있어요");
  });
});
