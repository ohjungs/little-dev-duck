import { describe, expect, it } from "vitest";
import {
  REACTION_EMOJIS,
  shouldRemoveReaction,
  summarizeReactions,
  type Reaction,
} from "./reaction";

const ME = "me";
const OTHER = "other";
const r = (emoji: string, userId: string, messageId = "m1"): Reaction => ({
  messageId,
  userId,
  emoji,
});

describe("반응 요약", () => {
  it("종류별로 센다", () => {
    const out = summarizeReactions([r("👍", ME), r("👍", OTHER), r("🎉", OTHER)], "m1", ME);
    expect(out).toEqual([
      { emoji: "👍", count: 2, mine: true },
      { emoji: "🎉", count: 1, mine: false },
    ]);
  });

  it("등장 순서를 유지한다 (개수순이면 누를 때마다 버튼이 움직인다)", () => {
    const out = summarizeReactions([r("🎉", OTHER), r("👍", ME), r("👍", OTHER)], "m1", ME);
    expect(out.map((s) => s.emoji)).toEqual(["🎉", "👍"]);
  });

  it("다른 메시지의 반응은 세지 않는다", () => {
    const out = summarizeReactions([r("👍", ME, "m2")], "m1", ME);
    expect(out).toEqual([]);
  });

  it("로그인하지 않았으면 내 것이 없다", () => {
    const out = summarizeReactions([r("👍", ME)], "m1", null);
    expect(out[0]!.mine).toBe(false);
  });

  it("빈 목록에도 던지지 않는다", () => {
    expect(summarizeReactions([], "m1", ME)).toEqual([]);
  });
});

describe("다시 누르면 해제", () => {
  it("이미 단 것이면 해제로 판정한다", () => {
    expect(shouldRemoveReaction([r("👍", ME)], "m1", ME, "👍")).toBe(true);
  });

  it("남이 단 같은 이모지는 내 것이 아니다", () => {
    expect(shouldRemoveReaction([r("👍", OTHER)], "m1", ME, "👍")).toBe(false);
  });

  it("안 단 것이면 추가로 판정한다", () => {
    expect(shouldRemoveReaction([r("👍", ME)], "m1", ME, "🎉")).toBe(false);
  });
});

describe("반응 종류", () => {
  it("중복이 없다", () => {
    expect(new Set(REACTION_EMOJIS).size).toBe(REACTION_EMOJIS.length);
  });

  it("개수가 한 줄에 들어갈 만큼이다 (많으면 고르는 것 자체가 일이 된다)", () => {
    expect(REACTION_EMOJIS.length).toBeLessThanOrEqual(8);
  });
});
