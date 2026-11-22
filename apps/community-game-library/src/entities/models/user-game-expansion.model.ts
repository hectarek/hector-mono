import { z } from "zod";

// An expansion in a copy's box (docs/data-model.md, user_game_expansions): its base_game_id is
// the copy's game.
export const userGameExpansionSchema = z.object({
  userGameId: z.uuid(),
  gameId: z.uuid(),
});
export type UserGameExpansion = z.infer<typeof userGameExpansionSchema>;
