import { describe, expect, it } from "vitest";
import { XP_REWARDS } from "./balance";
import { deriveLevel, levelProgress, xpAfterAward, xpForLevel } from "./duck-xp";

describe("xpForLevel", () => {
  it("레벨 1은 0 XP", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(0)).toBe(0);
  });

  it("삼각수 곡선: 2=100, 3=300, 4=600", () => {
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(xpForLevel(4)).toBe(600);
  });
});

describe("deriveLevel", () => {
  it("0 XP는 레벨 1", () => {
    expect(deriveLevel(0)).toBe(1);
    expect(deriveLevel(-5)).toBe(1);
  });

  it("경계 XP에서 정확히 레벨업", () => {
    expect(deriveLevel(99)).toBe(1);
    expect(deriveLevel(100)).toBe(2);
    expect(deriveLevel(299)).toBe(2);
    expect(deriveLevel(300)).toBe(3);
  });
});

describe("xpAfterAward", () => {
  it("원천별 획득량을 더한다", () => {
    expect(xpAfterAward(0, "todoComplete")).toBe(XP_REWARDS.todoComplete);
    expect(xpAfterAward(50, "commit")).toBe(50 + XP_REWARDS.commit);
  });
});

describe("levelProgress", () => {
  it("레벨 구간 진행도를 0~1로 반환", () => {
    // 레벨 2(100)~3(300) 구간, 200 XP는 100/200 = 0.5 지점
    const p = levelProgress(200);
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(100);
    expect(p.span).toBe(200);
    expect(p.ratio).toBeCloseTo(0.5);
  });

  it("레벨 시작점은 ratio 0", () => {
    expect(levelProgress(100).ratio).toBe(0);
  });
});
