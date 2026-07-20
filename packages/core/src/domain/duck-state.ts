import { z } from "zod";

export const duckStateSchema = z.object({
  userId: z.string().uuid(),
  xp: z.number().int().min(0),
  level: z.number().int().min(1),
  feed: z.number().int().min(0).max(100),
  costume: z.string().min(1).max(50),
  updatedAt: z.string().datetime(),
});

export type DuckState = z.infer<typeof duckStateSchema>;
