import { z } from "zod";

export const activitySourceSchema = z.enum(["github", "claude_code"]);

export type ActivitySource = z.infer<typeof activitySourceSchema>;

// count 상한: 하루 활동량이 현실적으로 도달할 수 없는 방어적 상한(가비지/오버플로 입력 차단).
export const ACTIVITY_COUNT_MAX = 100_000;

export const activityDailyEntrySchema = z.object({
  date: z.string().date(),
  source: activitySourceSchema,
  count: z.number().int().min(0).max(ACTIVITY_COUNT_MAX),
});

export type ActivityDailyEntry = z.infer<typeof activityDailyEntrySchema>;
