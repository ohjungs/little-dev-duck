import { z } from "zod";
import { epochDay } from "./date-util";

// 습관 빈도: 매일 or 주 N회. timesPerWeek는 weekly일 때만 의미(1~7).
export const habitSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(100),
  frequency: z.enum(["daily", "weekly"]),
  timesPerWeek: z.number().int().min(1).max(7).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Habit = z.infer<typeof habitSchema>;

// 습관 체크 1건 = 특정 로컬 날짜에 습관을 수행했다는 기록. (habit_id, checked_date) 유일.
export const habitCheckSchema = z.object({
  id: z.string().uuid(),
  habitId: z.string().uuid(),
  userId: z.string().uuid(),
  checkedDate: z.string().date(),
  createdAt: z.string().datetime({ offset: true }),
});

export type HabitCheck = z.infer<typeof habitCheckSchema>;

// 현재 연속 스트릭(일 단위). 마지막 체크가 오늘 또는 어제까지 이어졌으면 살아있는 것으로 보고,
// 그 지점에서 연속으로 이어진 날 수를 센다. 2일 이상 비면 0(끊김). 하루 경계는 로컬 자정 기준
// (호출부가 로컬 "YYYY-MM-DD"를 넘긴다 — Phase 7 T0 TZ 정책).
export function deriveHabitStreak(
  checkedDates: readonly string[],
  today: string,
): number {
  const days = new Set(checkedDates.map((d) => epochDay(d)));
  if (days.size === 0) return 0;

  const todayEpoch = epochDay(today);
  const latest = Math.max(...days);
  // 마지막 체크가 오늘도 어제도 아니면 스트릭이 끊긴 상태.
  if (latest < todayEpoch - 1) return 0;

  let streak = 0;
  let cursor = latest;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}
