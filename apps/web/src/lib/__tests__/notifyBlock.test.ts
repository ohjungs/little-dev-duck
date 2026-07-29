import { describe, expect, it } from "vitest";
import { notifyBlockReason, NOTIFY_BLOCK_MESSAGES } from "../notify";

// 2026-07-29 : 알림 - 테스트 발송 진단 (Phase 56 T1 M-031)
// "알림이 왜 안 오지?"에 답하는 진단. 사유마다 사람이 읽을 한국어가 있어야
// 화면이 코드 대신 말을 보여줄 수 있다.

describe("notifyBlockReason", () => {
  it("Notification API가 없는 환경(node)에서는 unsupported", () => {
    expect(notifyBlockReason()).toBe("unsupported");
  });
});

describe("NOTIFY_BLOCK_MESSAGES", () => {
  it("모든 차단 사유에 한국어 설명이 있다", () => {
    for (const reason of ["unsupported", "permission", "focus", "quiet", "cap"] as const) {
      expect(NOTIFY_BLOCK_MESSAGES[reason], reason).toBeTruthy();
      expect(NOTIFY_BLOCK_MESSAGES[reason].length).toBeGreaterThan(5);
    }
  });
});
