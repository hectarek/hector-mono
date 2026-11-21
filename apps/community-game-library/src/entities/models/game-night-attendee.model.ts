import { z } from "zod";

// A member on a night's list (docs/data-model.md, game_night_attendees): the host, anyone
// invited, and anyone who answered. A going member takes 1 seat plus their guests (R31, R47).
export const GAME_NIGHT_ATTENDEE_STATUSES = [
  "invited",
  "going",
  "maybe",
  "cant-go",
  "waitlisted",
] as const;

export const gameNightAttendeeSchema = z.object({
  gameNightId: z.uuid(),
  userId: z.uuid(),
  status: z.enum(GAME_NIGHT_ATTENDEE_STATUSES),
  guestCount: z.number().int().nonnegative(),
  // Who invited them by name; null for the host, an answer, or the night's link.
  invitedBy: z.uuid().nullable(),
  waitlistedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GameNightAttendee = z.infer<typeof gameNightAttendeeSchema>;
