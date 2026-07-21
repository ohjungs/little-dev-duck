import { z } from "zod";

export const activitySourceSchema = z.enum(["github", "claude_code"]);

export type ActivitySource = z.infer<typeof activitySourceSchema>;

export const activityDailyEntrySchema = z.object({
  date: z.string().date(),
  source: activitySourceSchema,
  count: z.number().int().min(0),
});

export type ActivityDailyEntry = z.infer<typeof activityDailyEntrySchema>;
