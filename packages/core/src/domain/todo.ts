import { z } from "zod";

export const todoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  isDone: z.boolean(),
  dueDate: z.string().datetime({ offset: true }).nullable(),
  // 반복 규칙(RRULE 어휘 문자열, 예: FREQ=WEEKLY;BYDAY=TU). 파싱은 recurrence.ts가 하고
  // 실패하면 "반복 없음"으로 취급하므로 여기서 문법까지 검증하지 않는다 — 검증을 두 곳에
  // 두면 규칙이 갈라진다. 기본값 null이라 이 컬럼을 모르는 기존 호출부는 영향받지 않는다.
  recurrence: z.string().nullable().default(null),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type Todo = z.infer<typeof todoSchema>;
