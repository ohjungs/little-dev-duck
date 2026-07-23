import { describe, expect, it } from "vitest";
import { pageStats } from "./page-stats";

describe("pageStats", () => {
  it("빈 문자열/공백만이면 전부 0", () => {
    expect(pageStats("")).toEqual({ chars: 0, words: 0, readMinutes: 0 });
    expect(pageStats("   \n\t ")).toEqual({ chars: 0, words: 0, readMinutes: 0 });
  });

  it("글자 수는 공백을 제외하고 센다", () => {
    // "안녕 하세요" → 공백 제외 5자
    expect(pageStats("안녕 하세요").chars).toBe(5);
  });

  it("단어 수는 공백 기준으로 센다", () => {
    expect(pageStats("hello world foo").words).toBe(3);
    expect(pageStats("  여러   공백  단어 ").words).toBe(3);
  });

  it("비지 않은 텍스트의 읽기 시간은 최소 1분", () => {
    expect(pageStats("짧은 글").readMinutes).toBe(1);
  });

  it("읽기 시간은 500자당 약 1분(올림)", () => {
    const text = "가".repeat(1200); // 공백 없는 1200자
    const stats = pageStats(text);
    expect(stats.chars).toBe(1200);
    expect(stats.readMinutes).toBe(3); // ceil(1200/500)=3
  });
});
