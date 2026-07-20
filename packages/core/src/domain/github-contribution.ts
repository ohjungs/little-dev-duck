import { z } from "zod";

export const contributionDaySchema = z.object({
  date: z.string().date(),
  count: z.number().int().min(0),
});

export type ContributionDay = z.infer<typeof contributionDaySchema>;

export const contributionSummarySchema = z.object({
  totalCount: z.number().int().min(0),
  days: z.array(contributionDaySchema),
});

export type ContributionSummary = z.infer<typeof contributionSummarySchema>;
