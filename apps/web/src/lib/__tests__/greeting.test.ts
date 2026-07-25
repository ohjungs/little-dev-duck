import { describe, it, expect } from "vitest";
import { getGreeting, getTimeEmoji } from "../greeting";

describe("getGreeting", () => {
  it("경계값에서 올바른 인사말 구간으로 나뉜다", () => {
    expect(getGreeting(0)).toBe("좋은 새벽이에요");
    expect(getGreeting(5)).toBe("좋은 새벽이에요");
    expect(getGreeting(6)).toBe("좋은 아침이에요");
    expect(getGreeting(11)).toBe("좋은 아침이에요");
    expect(getGreeting(12)).toBe("좋은 오후예요");
    expect(getGreeting(17)).toBe("좋은 오후예요");
    expect(getGreeting(18)).toBe("좋은 저녁이에요");
    expect(getGreeting(23)).toBe("좋은 저녁이에요");
  });
});

describe("getTimeEmoji", () => {
  it("시간대별 아이콘 경계가 인사말과 독립적으로 나뉜다(sunset 18-22, moon 22-6)", () => {
    // 새벽(0-5)과 밤(22-23)은 달
    expect(getTimeEmoji(0)).toBe(getTimeEmoji(23));
    expect(getTimeEmoji(5)).toBe(getTimeEmoji(22));
    // 아침 6-11
    expect(getTimeEmoji(6)).toBe(getTimeEmoji(11));
    expect(getTimeEmoji(6)).not.toBe(getTimeEmoji(5));
    // 오후 12-17
    expect(getTimeEmoji(12)).toBe(getTimeEmoji(17));
    expect(getTimeEmoji(12)).not.toBe(getTimeEmoji(11));
    // 노을 18-21
    expect(getTimeEmoji(18)).toBe(getTimeEmoji(21));
    expect(getTimeEmoji(18)).not.toBe(getTimeEmoji(17));
    expect(getTimeEmoji(22)).not.toBe(getTimeEmoji(21));
  });

  it("네 구간이 모두 서로 다른 아이콘이다", () => {
    const icons = new Set([
      getTimeEmoji(3), // 달
      getTimeEmoji(8), // 아침
      getTimeEmoji(14), // 오후
      getTimeEmoji(19), // 노을
    ]);
    expect(icons.size).toBe(4);
  });
});
