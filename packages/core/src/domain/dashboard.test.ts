import { describe, expect, it } from "vitest";
import { dashboardSummary, habitHeatmapData, pomodoroStats } from "./dashboard";
import { deriveLevel } from "./duck-xp";

describe("dashboardSummary", () => {
  const base = {
    todos: [],
    pageCount: 0,
    memoCount: 0,
    habitCount: 0,
    articleCount: 0,
    duckXp: null,
  };

  it("할 일 완료/미완료를 센다", () => {
    const s = dashboardSummary({
      ...base,
      todos: [{ isDone: true }, { isDone: false }, { isDone: false }],
    });
    expect(s.todosTotal).toBe(3);
    expect(s.todosDone).toBe(1);
    expect(s.todosRemaining).toBe(2);
  });

  it("각 카운트를 그대로 전달한다", () => {
    const s = dashboardSummary({
      ...base,
      pageCount: 5,
      memoCount: 4,
      habitCount: 3,
      articleCount: 7,
    });
    expect(s.pageCount).toBe(5);
    expect(s.memoCount).toBe(4);
    expect(s.habitCount).toBe(3);
    expect(s.articleCount).toBe(7);
  });

  it("레벨은 XP에서 파생, XP 없으면 1", () => {
    expect(dashboardSummary({ ...base, duckXp: null }).level).toBe(1);
    expect(dashboardSummary({ ...base, duckXp: 250 }).level).toBe(
      deriveLevel(250),
    );
  });
});

describe("pomodoroStats", () => {
  it("빈 배열이면 모두 0, topTag null", () => {
    const s = pomodoroStats([]);
    expect(s).toEqual({ totalMinutes: 0, sessionsCount: 0, avgMinutes: 0, topTag: null });
  });

  it("완료된 세션만 집계한다", () => {
    const s = pomodoroStats([
      { durationMinutes: 25, tag: "코딩", completedAt: "2026-07-20T10:00:00Z" },
      { durationMinutes: 30, tag: null, completedAt: null }, // 미완료 — 제외
      { durationMinutes: 15, tag: "코딩", completedAt: "2026-07-21T10:00:00Z" },
    ]);
    expect(s.sessionsCount).toBe(2);
    expect(s.totalMinutes).toBe(40);
    expect(s.avgMinutes).toBe(20);
    expect(s.topTag).toBe("코딩");
  });

  it("태그가 없으면 topTag는 null", () => {
    const s = pomodoroStats([
      { durationMinutes: 25, tag: null, completedAt: "2026-07-20T10:00:00Z" },
    ]);
    expect(s.topTag).toBeNull();
  });
});

describe("habitHeatmapData", () => {
  it("체크가 없으면 모두 count 0", () => {
    const result = habitHeatmapData([], "2026-07-24", 7);
    expect(result).toHaveLength(7);
    expect(result.every((d) => d.count === 0)).toBe(true);
    expect(result[result.length - 1].date).toBe("2026-07-24");
  });

  it("일치하는 날짜에 count를 누적한다", () => {
    const result = habitHeatmapData(
      [
        { checkedDate: "2026-07-22" },
        { checkedDate: "2026-07-22" },
        { checkedDate: "2026-07-24" },
      ],
      "2026-07-24",
      7,
    );
    const day22 = result.find((d) => d.date === "2026-07-22");
    const day24 = result.find((d) => d.date === "2026-07-24");
    expect(day22?.count).toBe(2);
    expect(day24?.count).toBe(1);
  });
});
