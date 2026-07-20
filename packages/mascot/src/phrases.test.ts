import { describe, expect, it } from "vitest";
import { CLICK_PHRASES, pickPhrase } from "./phrases";

describe("pickPhrase", () => {
  it("클릭 횟수 0이면 첫 번째 문구를 반환한다", () => {
    expect(pickPhrase(0)).toBe(CLICK_PHRASES[0]);
  });

  it("문구 개수를 넘는 클릭 횟수는 순환한다", () => {
    expect(pickPhrase(CLICK_PHRASES.length)).toBe(CLICK_PHRASES[0]);
    expect(pickPhrase(CLICK_PHRASES.length + 1)).toBe(CLICK_PHRASES[1]);
  });

  it("음수 클릭 횟수도 항상 유효한 문구를 반환한다", () => {
    expect(CLICK_PHRASES).toContain(pickPhrase(-1));
  });
});
