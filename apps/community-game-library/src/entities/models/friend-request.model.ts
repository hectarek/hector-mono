import { z } from "zod";

// A one-tap friend request (docs/data-model.md, friend_requests; R49): one per pair of people,
// either way round. Accepting deletes it; a declined one stays, so its sender isn't told.
export const FRIEND_REQUEST_STATUSES = ["waiting", "declined"] as const;

// The recipient's answers (E1): accepting makes the friendship, declining keeps the request.
export const FRIEND_REQUEST_ANSWERS = ["accept", "decline"] as const;
export type FriendRequestAnswer = (typeof FRIEND_REQUEST_ANSWERS)[number];

export const friendRequestSchema = z.object({
  id: z.uuid(),
  createdBy: z.uuid(),
  recipientUserId: z.uuid(),
  status: z.enum(FRIEND_REQUEST_STATUSES),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FriendRequest = z.infer<typeof friendRequestSchema>;
