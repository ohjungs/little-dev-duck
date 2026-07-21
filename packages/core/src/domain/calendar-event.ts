import { z } from "zod";
import { epochDay } from "./date-util";

// 캘린더 이벤트(생산성 모듈). endAt이 null이면 시점 이벤트(종일/기한). Phase 11의 DB 캘린더 뷰와는
// 별개(생산성 위젯용) — 중복 설계는 Phase 11 착수 시 정리(notion-gap-analysis 2-2).
export const calendarEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

// D-day: 오늘(로컬 "YYYY-MM-DD") 기준 이벤트 날짜까지 남은 일수. 양수=미래, 0=오늘, 음수=지남.
// eventDate는 "YYYY-MM-DD" 또는 datetime(날짜 부분만 사용).
export function daysUntil(eventDate: string, today: string): number {
  return epochDay(eventDate) - epochDay(today);
}
