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
