import { describe, expect, it } from "vitest";
import { formatStandupPrompt, hasActivity, type StandupInput } from "./standup";

const empty: StandupInput = {
  todosCompleted: 0, todosTotal: 0, habitsChecked: 0, habitsTotal: 0,
  pomodoroMinutes: 0, pomodoroSessions: 0, calendarEvents: [], pagesEdited: 0,
};

describe("standup", () => {
  it("formatStandupPrompt includes activity data", () => {
    const p = formatStandupPrompt({ ...empty, todosCompleted: 3, todosTotal: 5 }, "2026-07-24");
    expect(p).toContain("3/5 완료");
    expect(p).toContain("2026-07-24");
  });
  it("hasActivity returns false for empty", () => {
    expect(hasActivity(empty)).toBe(false);
  });
  it("hasActivity returns true with any data", () => {
    expect(hasActivity({ ...empty, pomodoroSessions: 1, pomodoroMinutes: 25 })).toBe(true);
  });
});
