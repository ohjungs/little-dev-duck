import { z } from "zod";

// 뽀모도로 집중 세션 1건. completedAt이 null이면 진행 중 또는 중단(완료 XP 미지급).
export const pomodoroSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  durationMinutes: z.number().int().min(1).max(180),
  tag: z.string().max(50).nullable(),
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export type PomodoroSession = z.infer<typeof pomodoroSessionSchema>;
