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

// 2026-07-29 : 할 일 - 마감일순 보기 (Phase 62 T2)
// **보기 전용 정렬** — 저장된 사용자 지정 순서(todoOrder)는 건드리지 않는다. 마감일이
// 없는 항목은 뒤로(마감이 있는 것부터 처리하는 보기이므로). Array.prototype.sort는
// ES2019부터 안정 정렬이라 같은 값끼리 원래 순서가 유지된다.
export function sortTodosByDue<T extends { dueDate: string | null }>(
  todos: readonly T[],
): T[] {
  return [...todos].sort((a, b) => {
    if (a.dueDate === null && b.dueDate === null) return 0;
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
  });
}
