import { describe, expect, it } from "vitest";
import { summarizeHabitsForDuck, DUCK_HABIT_RANGE_DAYS } from "./habit-query";
import type { Habit, HabitCheck } from "./habit";

// 오리는 습관을 **체크할 수는 있는데(checkHabit) 어떻게 하고 있는지는 못 말했다.**
// "이번 주 운동 며칠 했어?"는 세는 질문이라 벡터 검색으로는 원리상 못 푼다 — 상위 몇 개를
// 골라줄 뿐 개수를 세어주지 않는다. 할 일·일정에 이어 같은 공백을 메운다.

const TODAY = "2026-07-26";

function habit(id: string, title: string): Habit {
  return {
    id,
    userId: "u1",
    title,
    frequency: "daily",
    timesPerWeek: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  } as Habit;
}

function check(habitId: string, date: string): HabitCheck {
  return {
    id: `${habitId}-${date}`,
    habitId,
    userId: "u1",
    checkedDate: date,
    createdAt: "2026-07-01T00:00:00.000Z",
  } as HabitCheck;
}

describe("summarizeHabitsForDuck", () => {
  it("습관마다 제목·오늘 체크 여부·연속일수·기간 내 횟수를 준다", () => {
    const got = summarizeHabitsForDuck(
      [habit("h1", "운동")],
      [check("h1", "2026-07-26"), check("h1", "2026-07-25")],
      TODAY,
    );
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({
      title: "운동",
      checkedToday: true,
      streak: 2,
      doneInRange: 2,
    });
  });

  it("오늘 체크하지 않았으면 checkedToday가 false다", () => {
    const got = summarizeHabitsForDuck(
      [habit("h1", "운동")],
      [check("h1", "2026-07-25")],
      TODAY,
    );
    expect(got[0].checkedToday).toBe(false);
  });

  it("체크가 하나도 없어도 습관은 빠지지 않는다", () => {
    // "요즘 뭐 안 하고 있지?"에 답하려면 0회인 습관이 보여야 한다. 빼면 그 질문이 막힌다.
    const got = summarizeHabitsForDuck([habit("h1", "독서")], [], TODAY);
    expect(got).toEqual([
      { title: "독서", checkedToday: false, streak: 0, doneInRange: 0, rangeDays: DUCK_HABIT_RANGE_DAYS },
    ]);
  });

  it("다른 습관의 체크를 섞어 세지 않는다", () => {
    const got = summarizeHabitsForDuck(
      [habit("h1", "운동"), habit("h2", "독서")],
      [check("h1", "2026-07-26"), check("h1", "2026-07-25"), check("h2", "2026-07-26")],
      TODAY,
    );
    const byTitle = Object.fromEntries(got.map((h) => [h.title, h]));
    expect(byTitle["운동"].doneInRange).toBe(2);
    expect(byTitle["독서"].doneInRange).toBe(1);
  });

  it("기간 밖 체크는 횟수에서 빼지만 연속일수 계산은 방해하지 않는다", () => {
    const old = "2026-06-01";
    const got = summarizeHabitsForDuck(
      [habit("h1", "운동")],
      [check("h1", old), check("h1", "2026-07-26")],
      TODAY,
    );
    expect(got[0].doneInRange).toBe(1);
    expect(got[0].streak).toBe(1);
  });

  it("기간 일수를 함께 알려준다 — 오리가 '7일 중 3일'처럼 말할 수 있게", () => {
    const got = summarizeHabitsForDuck([habit("h1", "운동")], [], TODAY, 14);
    expect(got[0].rangeDays).toBe(14);
  });

  it("습관이 없으면 빈 배열", () => {
    expect(summarizeHabitsForDuck([], [], TODAY)).toEqual([]);
  });

  it("미래 날짜 체크가 섞여 있어도 기간 내로 세지 않는다", () => {
    const got = summarizeHabitsForDuck(
      [habit("h1", "운동")],
      [check("h1", "2026-08-01")],
      TODAY,
    );
    expect(got[0].doneInRange).toBe(0);
  });
});
