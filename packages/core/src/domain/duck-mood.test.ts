import { describe, expect, it } from "vitest";
import {
  DUCK_MOODS,
  STALE_COMMIT_DAYS,
  daysSinceLastCommit,
  deriveDuckMood,
} from "./duck-mood";
import type { ContributionDay } from "./github-contribution";

describe("deriveDuckMood", () => {
  it("오늘 할 일이 있고 전부 끝냈으면 happy", () => {
    expect(
      deriveDuckMood({
        todayTodos: { total: 3, done: 3 },
        daysSinceLastCommit: 0,
      }),
    ).toBe("happy");
  });

  it("오늘 할 일이 하나도 없으면 happy가 아니다 (아무것도 이룬 게 없음)", () => {
    expect(
      deriveDuckMood({
        todayTodos: { total: 0, done: 0 },
        daysSinceLastCommit: 0,
      }),
    ).toBe("neutral");
  });

  it("오늘 할 일이 남아 있으면 neutral", () => {
    expect(
      deriveDuckMood({
        todayTodos: { total: 3, done: 1 },
        daysSinceLastCommit: 0,
      }),
    ).toBe("neutral");
  });

  it("할 일을 다 끝냈으면 커밋이 오래 밀렸어도 happy가 우선", () => {
    expect(
      deriveDuckMood({
        todayTodos: { total: 2, done: 2 },
        daysSinceLastCommit: 10,
      }),
    ).toBe("happy");
  });

  it("며칠째 커밋이 없고 (기준일 이상) 남은 할 일도 없으면 sad", () => {
    expect(
      deriveDuckMood({
        todayTodos: { total: 0, done: 0 },
        daysSinceLastCommit: STALE_COMMIT_DAYS,
      }),
    ).toBe("sad");
  });

  it("최근에 커밋했으면 (기준일 미만) neutral", () => {
    expect(
      deriveDuckMood({
        todayTodos: { total: 0, done: 0 },
        daysSinceLastCommit: STALE_COMMIT_DAYS - 1,
      }),
    ).toBe("neutral");
  });

  it("커밋 기록이 없으면 (null) sad로 판정하지 않는다", () => {
    expect(
      deriveDuckMood({
        todayTodos: { total: 0, done: 0 },
        daysSinceLastCommit: null,
      }),
    ).toBe("neutral");
  });

  it("반환값은 항상 정의된 mood 집합에 속한다", () => {
    const mood = deriveDuckMood({
      todayTodos: { total: 1, done: 0 },
      daysSinceLastCommit: 1,
    });
    expect(DUCK_MOODS).toContain(mood);
  });
});

describe("daysSinceLastCommit", () => {
  const day = (date: string, count: number): ContributionDay => ({ date, count });

  it("커밋한 날이 하나도 없으면 null", () => {
    expect(daysSinceLastCommit([], "2026-07-21")).toBeNull();
    expect(
      daysSinceLastCommit([day("2026-07-20", 0), day("2026-07-21", 0)], "2026-07-21"),
    ).toBeNull();
  });

  it("오늘 커밋했으면 0", () => {
    expect(
      daysSinceLastCommit([day("2026-07-21", 5)], "2026-07-21"),
    ).toBe(0);
  });

  it("3일 전이 마지막 커밋이면 3", () => {
    expect(
      daysSinceLastCommit([day("2026-07-18", 2)], "2026-07-21"),
    ).toBe(3);
  });

  it("여러 날 중 가장 최근 커밋일 기준으로 계산", () => {
    expect(
      daysSinceLastCommit(
        [day("2026-07-10", 4), day("2026-07-19", 1), day("2026-07-15", 0)],
        "2026-07-21",
      ),
    ).toBe(2);
  });

  it("월 경계를 넘어도 실제 일수로 계산", () => {
    expect(
      daysSinceLastCommit([day("2026-06-29", 1)], "2026-07-02"),
    ).toBe(3);
  });
});
