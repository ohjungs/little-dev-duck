import { z } from "zod";

export const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1).max(50),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export type Profile = z.infer<typeof profileSchema>;
