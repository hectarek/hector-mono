import { z } from "zod";

// One physical copy a member owns (docs/data-model.md, user_games): the screens' "copy". A member
// can own two copies of one game, each lent on its own (R9).
export const USER_GAME_CONDITIONS = ["like-new", "good", "worn"] as const;

export const userGameSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  gameId: z.uuid(),
  condition: z.enum(USER_GAME_CONDITIONS),
  conditionNote: z.string().nullable(),
  lendable: z.boolean(),
  passAlong: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type UserGame = z.infer<typeof userGameSchema>;

// A copy someone has just said they own (I own it): pass-along starts as their default (R48).
export type NewUserGame = Pick<UserGame, "userId" | "gameId" | "passAlong">;

// What a copy's page changes: Save's condition and missing parts, and the two lending switches.
export type UserGameChanges = Partial<
  Pick<UserGame, "condition" | "conditionNote" | "lendable" | "passAlong">
>;

// B7's This copy, as Save sends it: the condition, what's missing (blank for nothing), and the
// expansions ticked in its box.
export const copyFormSchema = z.object({
  condition: z.enum(USER_GAME_CONDITIONS),
  conditionNote: z
    .string()
    .trim()
    .max(200)
    .transform((note) => (note === "" ? null : note)),
  expansionIds: z.array(z.uuid()),
});
export type CopyForm = z.infer<typeof copyFormSchema>;
