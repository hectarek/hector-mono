import { z } from "zod";

// An account the admin removed (docs/data-model.md, removed_users; G8, R41). The row stays, so the
// account can't come back.
export const removedUserSchema = z.object({
  userId: z.uuid(),
  removedAt: z.date(),
});
export type RemovedUser = z.infer<typeof removedUserSchema>;
