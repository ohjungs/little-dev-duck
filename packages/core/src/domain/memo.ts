import { z } from "zod";

export const memoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().max(10000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Memo = z.infer<typeof memoSchema>;
