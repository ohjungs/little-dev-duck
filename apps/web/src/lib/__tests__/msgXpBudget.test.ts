import { describe, expect, it } from "vitest";
import { consumeMessageXpBudget, MESSAGE_XP_DAILY_CAP } from "../msgXpBudget";

// 2026-07-29 : 오리 - 대화 XP 하루 상한 (Phase 59 T3 Y-007)
describe("consumeMessageXpBudget", () => {
  it("window가 없는 환경(node/SSR)에서는 막지 않는다", () => {
    expect(consumeMessageXpBudget()).toBe(true);
  });

  it("상한 상수가 소액 보상 전제와 맞다 (하루 최대 = cap × 1XP)", () => {
    // 20이면 하루 최대 20XP — 할 일 2개 완료 수준. 대화가 주 수입원이 되지 않는다.
    expect(MESSAGE_XP_DAILY_CAP).toBeLessThanOrEqual(20);
    expect(MESSAGE_XP_DAILY_CAP).toBeGreaterThan(0);
  });
});
