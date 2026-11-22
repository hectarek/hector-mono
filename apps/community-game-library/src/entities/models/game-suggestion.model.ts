import { z } from "zod";

// A member's suggestion of a game search didn't find (docs/data-model.md, game_suggestions; R4).
// "already-here" is G2's "It's already here": the admin added nothing.
export const GAME_SUGGESTION_STATUSES = [
  "waiting",
  "added",
  "already-here",
  "declined",
] as const;

export const gameSuggestionSchema = z.object({
  id: z.uuid(),
  createdBy: z.uuid(),
  title: z.string().min(1),
  year: z.number().int().nullable(),
  publisher: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  status: z.enum(GAME_SUGGESTION_STATUSES),
  declineNote: z.string().nullable(),
  // Once it's added, or already here.
  gameId: z.uuid().nullable(),
  answeredAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type GameSuggestion = z.infer<typeof gameSuggestionSchema>;

// What a member sends (B9): the title, and what else they know.
export type NewGameSuggestion = Pick<
  GameSuggestion,
  "createdBy" | "title" | "year" | "publisher" | "sourceUrl" | "imageUrl"
>;

// The admin's answer (G2): added or already here points at the game, a decline carries its
// reason (R4's audit line).
export type SuggestionAnswer =
  | { status: "added" | "already-here"; gameId: string }
  | { status: "declined"; declineNote: string };
