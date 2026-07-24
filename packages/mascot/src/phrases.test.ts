import { describe, expect, it } from "vitest";
import {
  CLICK_PHRASES,
  CLICK_PHRASES_BY_MOOD,
  IDLE_PHRASES,
  pickClickPhrase,
  pickIdlePhrase,
  pickPhrase,
} from "./phrases";
import { DUCK_MOODS } from "@ldd/core";

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

describe("pickClickPhrase", () => {
  it("neutral mood은 기존 CLICK_PHRASES 풀을 사용한다", () => {
    expect(pickClickPhrase(0, "neutral")).toBe(CLICK_PHRASES[0]);
    expect(pickClickPhrase(1, "neutral")).toBe(CLICK_PHRASES[1]);
  });

  it("happy/sad mood은 각자의 풀에서 순환한다", () => {
    for (const mood of ["happy", "sad"] as const) {
      const pool = CLICK_PHRASES_BY_MOOD[mood];
      expect(pickClickPhrase(0, mood)).toBe(pool[0]);
      expect(pickClickPhrase(pool.length, mood)).toBe(pool[0]);
      expect(pickClickPhrase(pool.length + 1, mood)).toBe(pool[1]);
    }
  });

  it("모든 mood에 대해 반환 문구가 해당 풀에 속한다", () => {
    for (const mood of DUCK_MOODS) {
      const pool = CLICK_PHRASES_BY_MOOD[mood];
      for (let i = 0; i < pool.length + 2; i += 1) {
        expect(pool).toContain(pickClickPhrase(i, mood));
      }
    }
  });

  it("각 mood 풀은 최소 5개 문구를 가진다", () => {
    for (const mood of DUCK_MOODS) {
      expect(CLICK_PHRASES_BY_MOOD[mood].length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe("pickIdlePhrase", () => {
  it("모든 mood에 대해 비어있지 않은 문구 풀이 있다", () => {
    for (const mood of DUCK_MOODS) {
      expect(IDLE_PHRASES[mood].length).toBeGreaterThan(0);
    }
  });

  it("반환 문구는 항상 해당 mood의 풀에 속한다 (여러 번 시도해도)", () => {
    for (const mood of DUCK_MOODS) {
      for (let i = 0; i < 20; i += 1) {
        expect(IDLE_PHRASES[mood]).toContain(pickIdlePhrase(mood));
      }
    }
  });
});
