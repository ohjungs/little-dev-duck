import { describe, expect, it } from "vitest";
import { XP_REWARDS } from "./balance";


// 2026-07-29 : 오리 - 대화 XP (Phase 59 T3 Y-007)
describe("XP_REWARDS.messageSent", () => {
  it("보상표에서 가장 작다 — 대화는 성취가 아니라 접촉이다(도배 = XP 농사 방지)", () => {
    const others = Object.entries(XP_REWARDS)
      .filter(([k]) => k !== "messageSent")
      .map(([, v]) => v);
    expect(XP_REWARDS.messageSent).toBeGreaterThan(0);
    for (const v of others) expect(XP_REWARDS.messageSent).toBeLessThan(v);
  });
});
