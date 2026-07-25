import { describe, it, expect } from "vitest";
import { toggleInList } from "../bookmarkedArticles";

describe("bookmarkedArticles toggleInList", () => {
  it("빈 목록에 추가한다", () => {
    expect(toggleInList([], "a", 200)).toEqual(["a"]);
  });

  it("이미 있으면 제거한다", () => {
    expect(toggleInList(["a", "b"], "a", 200)).toEqual(["b"]);
  });

  it("최신을 맨 앞에 추가한다(prepend)", () => {
    expect(toggleInList(["b", "c"], "a", 200)).toEqual(["a", "b", "c"]);
  });

  it("상한(max)을 넘으면 가장 오래된 것이 밀려난다", () => {
    // max=2: 새 id를 앞에 넣고 2개로 자름 → 마지막(가장 오래된) 것 탈락
    expect(toggleInList(["b", "c"], "a", 2)).toEqual(["a", "b"]);
  });

  it("제거는 상한과 무관하게 동작한다", () => {
    expect(toggleInList(["a", "b", "c"], "b", 2)).toEqual(["a", "c"]);
  });

  it("원본 배열을 변형하지 않는다(순수)", () => {
    const src = ["a", "b"];
    toggleInList(src, "c", 200);
    expect(src).toEqual(["a", "b"]);
  });
});
