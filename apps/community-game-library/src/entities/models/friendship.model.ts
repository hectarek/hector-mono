import { z } from "zod";

// One side of a friendship (docs/data-model.md, friendships): each has two rows, one from each
// side, made and removed together, so a member's friends are one lookup (R10, R49).
export const friendshipSchema = z.object({
  userId: z.uuid(),
  friendUserId: z.uuid(),
  createdAt: z.date(),
});
export type Friendship = z.infer<typeof friendshipSchema>;
