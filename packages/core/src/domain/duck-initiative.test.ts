import { describe, it, expect } from "vitest";
import {
  INITIATIVE_DAILY_CAP,
  buildInitiatives,
  pickInitiative,
  type InitiativeInput,
} from "./duck-initiative";

const base: InitiativeInput = {
  hour: 14,
  overdueTodos: 0,
  dueTodayTodos: 0,
  uncheckedHabits: [],
  nextEventInMinutes: null,
  nextEventTitle: null,
};

describe("buildInitiatives", () => {
  it("말할 거리가 없으면 아무것도 만들지 않는다", () => {
    // 할 말이 없는데 말을 거는 건 방해다.
    expect(buildInitiatives(base)).toEqual([]);
  });

  it("기한이 지난 할 일이 가장 급하다", () => {
    const list = buildInitiatives({
      ...base,
      overdueTodos: 2,
      dueTodayTodos: 3,
      uncheckedHabits: ["운동"],
    });
    expect(list[0].kind).toBe("overdue");
  });

  it("우선순위 순으로 정렬해서 준다", () => {
    const list = buildInitiatives({
      ...base,
      overdueTodos: 1,
      dueTodayTodos: 1,
      uncheckedHabits: ["운동"],
      nextEventInMinutes: 30,
      nextEventTitle: "회의",
    });
    const priorities = list.map((c) => c.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });

  it("개수를 문장에 담는다 (숫자가 없으면 확인하러 가야 한다)", () => {
    const [top] = buildInitiatives({ ...base, overdueTodos: 3 });
    expect(top.message).toContain("3");
  });

  it("곧 있을 일정만 알린다", () => {
    // 8시간 뒤 일정을 지금 알리면 그냥 소음이다.
    const soon = buildInitiatives({
      ...base,
      nextEventInMinutes: 20,
      nextEventTitle: "치과",
    });
    expect(soon.some((c) => c.kind === "upcomingEvent")).toBe(true);
    const later = buildInitiatives({
      ...base,
      nextEventInMinutes: 480,
      nextEventTitle: "치과",
    });
    expect(later.some((c) => c.kind === "upcomingEvent")).toBe(false);
  });

  it("이미 지난 일정은 알리지 않는다", () => {
    const past = buildInitiatives({
      ...base,
      nextEventInMinutes: -10,
      nextEventTitle: "치과",
    });
    expect(past.some((c) => c.kind === "upcomingEvent")).toBe(false);
  });

  it("습관은 하루가 저물 때만 재촉한다", () => {
    // 아침 9시에 "오늘 운동 안 했다"고 하면 틀린 말은 아니지만 무례하다.
    expect(
      buildInitiatives({ ...base, hour: 9, uncheckedHabits: ["운동"] }),
    ).toEqual([]);
    expect(
      buildInitiatives({ ...base, hour: 20, uncheckedHabits: ["운동"] }).some(
        (c) => c.kind === "habit",
      ),
    ).toBe(true);
  });

  it("습관 제목을 그대로 쓴다 (여러 개면 개수로 말한다)", () => {
    const one = buildInitiatives({ ...base, hour: 20, uncheckedHabits: ["독서"] });
    expect(one[0].message).toContain("독서");
    const many = buildInitiatives({
      ...base,
      hour: 20,
      uncheckedHabits: ["독서", "운동", "물마시기"],
    });
    expect(many[0].message).toContain("3");
  });

  it("표정이 문장과 맞는다", () => {
    // 사용자가 "이미지랑 통합"을 요구했다 — 재촉하면서 웃고 있으면 어긋난다.
    const [overdue] = buildInitiatives({ ...base, overdueTodos: 1 });
    expect(overdue.mood).toBe("sad");
    const [event] = buildInitiatives({
      ...base,
      nextEventInMinutes: 15,
      nextEventTitle: "회의",
    });
    expect(event.mood).toBe("neutral");
  });

  it("입력이 이상해도 죽지 않는다", () => {
    // 음수·거대한 값·빈 제목이 와도 화면이 멎으면 안 된다.
    expect(() =>
      buildInitiatives({
        ...base,
        hour: -3,
        overdueTodos: -1,
        dueTodayTodos: 99999,
        uncheckedHabits: [""],
        nextEventInMinutes: Number.NaN,
        nextEventTitle: "",
      }),
    ).not.toThrow();
  });

  it("음수 개수를 말하지 않는다", () => {
    expect(buildInitiatives({ ...base, overdueTodos: -5 })).toEqual([]);
  });
});

describe("pickInitiative", () => {
  const withOverdue = { ...base, overdueTodos: 1 };

  it("가장 급한 것 하나만 고른다", () => {
    const picked = pickInitiative(
      { ...base, overdueTodos: 1, dueTodayTodos: 1 },
      { spokenKinds: [], spokenCount: 0, quiet: false },
    );
    expect(picked?.kind).toBe("overdue");
  });

  it("방해금지 시간대엔 아무 말도 하지 않는다", () => {
    expect(
      pickInitiative(withOverdue, { spokenKinds: [], spokenCount: 0, quiet: true }),
    ).toBeNull();
  });

  // 같은 상황을 하루에 몇 번이고 말하면 그건 잔소리다.
  it("오늘 이미 한 종류는 다시 말하지 않는다", () => {
    expect(
      pickInitiative(withOverdue, {
        spokenKinds: ["overdue"],
        spokenCount: 1,
        quiet: false,
      }),
    ).toBeNull();
  });

  it("다른 종류는 아직 말할 수 있다", () => {
    const picked = pickInitiative(
      { ...base, overdueTodos: 1, dueTodayTodos: 2 },
      { spokenKinds: ["overdue"], spokenCount: 1, quiet: false },
    );
    expect(picked?.kind).toBe("dueToday");
  });

  it("하루 총량 상한에 닿으면 멈춘다", () => {
    expect(
      pickInitiative(
        { ...base, overdueTodos: 1, dueTodayTodos: 1, hour: 20, uncheckedHabits: ["운동"] },
        { spokenKinds: [], spokenCount: INITIATIVE_DAILY_CAP, quiet: false },
      ),
    ).toBeNull();
  });

  it("상한 직전이면 아직 말한다 (경계)", () => {
    expect(
      pickInitiative(withOverdue, {
        spokenKinds: [],
        spokenCount: INITIATIVE_DAILY_CAP - 1,
        quiet: false,
      }),
    ).not.toBeNull();
  });

  it("말할 거리가 없으면 null", () => {
    expect(
      pickInitiative(base, { spokenKinds: [], spokenCount: 0, quiet: false }),
    ).toBeNull();
  });
});
