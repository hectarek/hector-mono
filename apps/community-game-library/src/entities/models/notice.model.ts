import { z } from "zod";
import { NOTICE_TYPES } from "../notice-types";

// One person told (docs/data-model.md, notices; R25 to R27). It points at one thing and goes when
// that thing goes; its words come from its type when it's read (KTD7).
export const noticeSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  type: z.enum(NOTICE_TYPES),
  // Who caused it; null for the daily run's reminders.
  createdBy: z.uuid().nullable(),
  loanId: z.uuid().nullable(),
  gameNightId: z.uuid().nullable(),
  gameSuggestionId: z.uuid().nullable(),
  friendRequestId: z.uuid().nullable(),
  // A note the other member typed, quoted in the line.
  answerNote: z.string().nullable(),
  // The day a reminder is for (KTD8).
  remindedOn: z.iso.date().nullable(),
  readAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Notice = z.infer<typeof noticeSchema>;
