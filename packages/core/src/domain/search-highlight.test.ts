import { describe, expect, it } from "vitest";
import { splitByQuery } from "./search-highlight";

describe("splitByQuery (검색 하이라이트 분할)", () => {
  it("맞은 부분만 hit으로 표시한다", () => {
    expect(splitByQuery("오늘 회의 있어요", "회의")).toEqual([
      { text: "오늘 ", hit: false },
      { text: "회의", hit: true },
      { text: " 있어요", hit: false },
    ]);
  });

  it("여러 번 나오면 전부 표시한다", () => {
    expect(splitByQuery("회의 후 회의록", "회의")).toEqual([
      { text: "회의", hit: true },
      { text: " 후 ", hit: false },
      { text: "회의", hit: true },
      { text: "록", hit: false },
    ]);
  });

  it("대소문자를 가리지 않되 원문 표기를 보존한다", () => {
    expect(splitByQuery("API와 api", "api")).toEqual([
      { text: "API", hit: true },
      { text: "와 ", hit: false },
      { text: "api", hit: true },
    ]);
  });

  it("정규식 특수문자를 문자로 취급한다 (검색어가 패턴이 되면 안 된다)", () => {
    expect(splitByQuery("가격은 $10 (할인)", "$10 (할인)")).toEqual([
      { text: "가격은 ", hit: false },
      { text: "$10 (할인)", hit: true },
    ]);
  });

  it("빈 검색어는 전체가 non-hit (전부 칠하면 하이라이트가 아니다)", () => {
    expect(splitByQuery("안녕", "")).toEqual([{ text: "안녕", hit: false }]);
    expect(splitByQuery("안녕", "   ")).toEqual([{ text: "안녕", hit: false }]);
  });

  it("못 찾으면 전체가 non-hit", () => {
    expect(splitByQuery("안녕", "없는말")).toEqual([{ text: "안녕", hit: false }]);
  });

  it("본문 전체가 검색어면 조각 하나", () => {
    expect(splitByQuery("회의", "회의")).toEqual([{ text: "회의", hit: true }]);
  });

  it("이모지·한글이 깨지지 않는다", () => {
    expect(splitByQuery("오리 🦆 최고", "🦆")).toEqual([
      { text: "오리 ", hit: false },
      { text: "🦆", hit: true },
      { text: " 최고", hit: false },
    ]);
  });
});
