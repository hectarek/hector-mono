import { z } from "zod";

// A member's one live friend link (docs/data-model.md, friend_links; R49, E2): a new one replaces
// the token and the date, so the old link stops working. It lasts a week.
export const friendLinkSchema = z.object({
  userId: z.uuid(),
  token: z.string(),
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FriendLink = z.infer<typeof friendLinkSchema>;
