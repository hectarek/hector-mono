import { z } from "zod";
import { NOTICE_TYPES } from "../notice-types";
import type { GameSuggestion } from "./game-suggestion.model";
import type { NameAndPiece } from "./user-profile.model";

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

// What a change writes for each person it tells, in its own transaction (KTD7): whom, what
// happened, who did it (no one, for the daily run), the one thing it's about, and a note they
// typed.
export type NewNotice = Pick<Notice, "userId" | "type"> &
  Partial<
    Pick<
      Notice,
      | "createdBy"
      | "loanId"
      | "gameNightId"
      | "gameSuggestionId"
      | "friendRequestId"
      | "answerNote"
    >
  >;

// A notice as the inbox shows it (F1): the row, and what it points at, as its words need them.
// Its night comes with nights' rows (U18).
export type InboxNotice = {
  notice: Notice;
  // Who caused it, while they're a member: "Sam said yes".
  actor: NameAndPiece | null;
  loan: {
    id: string;
    gameId: string;
    gameTitle: string;
    ownerId: string;
    borrowerId: string;
    borrowerName: string | null;
    requestNote: string | null;
    dueOn: string | null;
    moreTimeDueOn: string | null;
  } | null;
  night: { id: string; title: string; startsAt: Date } | null;
  suggestion: {
    id: string;
    title: string;
    status: GameSuggestion["status"];
    gameId: string | null;
  } | null;
};
