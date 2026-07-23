import { describe, expect, it } from "vitest";
import { dashboardSummary } from "./dashboard";
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
