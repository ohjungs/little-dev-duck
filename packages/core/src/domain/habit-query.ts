// 2026-07-26 : 오리 - 습관조회 - 세는질문
// 오리는 습관을 **체크할 수는 있는데(checkHabit) 어떻게 하고 있는지는 못 말했다.**
// "이번 주 운동 며칠 했어?"는 세는 질문이라 벡터 검색으로는 원리상 못 푼다 — 비슷한 걸
// 상위 몇 개 골라줄 뿐 개수를 세어주지 않는다. 할 일(todo-query)·일정(event-query)에 이어
// 같은 공백을 메운다.
//
// 습관 체크는 checkedDate가 이미 날짜 문자열(KST 기준으로 기록됨)이라 시간대 변환이 없다 —
// 이 저장소의 단골 함정인 UTC/로컬 자정 규약과 무관하다.

import { epochDay } from "./date-util";
import { deriveHabitStreak } from "./habit";
import type { Habit, HabitCheck } from "./habit";

/** 기본 집계 기간(일). "이번 주"를 묻는 경우가 가장 흔하다. */
export const DUCK_HABIT_RANGE_DAYS = 7;

export type DuckHabitSummary = {
  title: string;
  checkedToday: boolean;
  streak: number;
  /** 기간 내 체크 횟수 */
  doneInRange: number;
  /** 오리가 "7일 중 3일"처럼 말할 수 있게 분모를 함께 준다. */
  rangeDays: number;
};

export function summarizeHabitsForDuck(
  habits: Habit[],
  checks: HabitCheck[],
  today: string,
  rangeDays: number = DUCK_HABIT_RANGE_DAYS,
): DuckHabitSummary[] {
  const todayDay = epochDay(today);
  const byHabit = new Map<string, string[]>();
  for (const c of checks) {
    const list = byHabit.get(c.habitId);
    if (list) list.push(c.checkedDate);
    else byHabit.set(c.habitId, [c.checkedDate]);
  }

  return habits.map((h) => {
    const dates = byHabit.get(h.id) ?? [];
    // 기간 밖(과거·미래) 체크는 횟수에서 빼되, 연속일수는 전체 이력으로 계산한다 —
    // 기간으로 잘라서 세면 오래 이어온 연속이 갑자기 끊긴 것처럼 보인다.
    const inRange = dates.filter((d) => {
      const diff = todayDay - epochDay(d);
      return diff >= 0 && diff < rangeDays;
    });
    return {
      title: h.title,
      checkedToday: dates.some((d) => epochDay(d) === todayDay),
      streak: deriveHabitStreak(dates, today),
      doneInRange: inRange.length,
      rangeDays,
    };
  });
}
