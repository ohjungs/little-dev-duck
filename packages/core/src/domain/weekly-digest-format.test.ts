import { describe, expect, it } from "vitest";
import { formatWeeklyDigestLines, weeklyDigestTitle } from "./weekly-digest";
import type { StandupInput } from "./standup";

const FULL: StandupInput = {
  todosCompleted: 9,
  todosTotal: 12,
  habitsChecked: 15,
  habitsTotal: 15,
  pomodoroSessions: 8,
  pomodoroMinutes: 200,
  calendarEvents: ["팀 회의", "치과"],
  pagesEdited: 23,
};

const EMPTY: StandupInput = {
  todosCompleted: 0,
  todosTotal: 0,
  habitsChecked: 0,
  habitsTotal: 0,
  pomodoroSessions: 0,
  pomodoroMinutes: 0,
  calendarEvents: [],
  pagesEdited: 0,
};

const RANGE = { start: "2026-07-13", end: "2026-07-19" };

describe("weeklyDigestTitle", () => {
  it("기간이 제목에 들어간다", () => {
    const title = weeklyDigestTitle(RANGE);
    expect(title).toContain("2026-07-13");
    expect(title).toContain("2026-07-19");
  });

  it("같은 기간이면 같은 제목이다(중복 생성 판정과 어긋나지 않게)", () => {
    expect(weeklyDigestTitle(RANGE)).toBe(weeklyDigestTitle({ ...RANGE }));
  });
});

describe("formatWeeklyDigestLines", () => {
  it("활동 수치가 모두 드러난다", () => {
    const text = formatWeeklyDigestLines(FULL, RANGE).join("\n");
    expect(text).toContain("9");
    expect(text).toContain("12");
    expect(text).toContain("15");
    expect(text).toContain("200");
    expect(text).toContain("23");
  });

  it("기간을 명시한다", () => {
    const text = formatWeeklyDigestLines(FULL, RANGE).join("\n");
    expect(text).toContain("2026-07-13");
    expect(text).toContain("2026-07-19");
  });

  it("같은 입력이면 같은 출력이다(LLM 없이 결정적)", () => {
    expect(formatWeeklyDigestLines(FULL, RANGE)).toEqual(
      formatWeeklyDigestLines(FULL, RANGE),
    );
  });

  it("활동이 0이어도 빈 줄만 남기지 않고 안내한다", () => {
    const lines = formatWeeklyDigestLines(EMPTY, RANGE);
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.join("\n")).toContain("0");
  });

  it("일정이 없으면 일정 줄에 없다고 쓴다(빈 목록이 '  ,  '로 새지 않게)", () => {
    const text = formatWeeklyDigestLines(EMPTY, RANGE).join("\n");
    expect(text).not.toMatch(/일정:\s*$/m);
  });

  it("일정 제목에 개행이 있어도 한 줄로 눌러 담는다", () => {
    const text = formatWeeklyDigestLines(
      { ...FULL, calendarEvents: ["줄1\n줄2"] },
      RANGE,
    ).join("|");
    // 각 줄이 하나의 블록이 되므로 줄 안에 개행이 남으면 안 된다
    for (const line of formatWeeklyDigestLines(
      { ...FULL, calendarEvents: ["줄1\n줄2"] },
      RANGE,
    )) {
      expect(line).not.toContain("\n");
    }
    expect(text).toContain("줄1 줄2");
  });

  it("일정이 많으면 잘라내고 남은 개수를 알린다(페이지가 일정 목록으로 뒤덮이지 않게)", () => {
    const many = Array.from({ length: 40 }, (_, i) => `일정${i}`);
    const text = formatWeeklyDigestLines(
      { ...FULL, calendarEvents: many },
      RANGE,
    ).join("\n");
    expect(text).toContain("40");
    expect(text).not.toContain("일정39");
  });

  it("음수 같은 이상값에도 throw하지 않는다", () => {
    expect(() =>
      formatWeeklyDigestLines({ ...EMPTY, todosTotal: -3 }, RANGE),
    ).not.toThrow();
  });
});
