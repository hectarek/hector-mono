import { z } from "zod";

// A going member's "I'd play" for a game on a night's table (docs/data-model.md, game_night_votes;
// R38).
export const gameNightVoteSchema = z.object({
  gameNightId: z.uuid(),
  userGameId: z.uuid(),
  userId: z.uuid(),
});
export type GameNightVote = z.infer<typeof gameNightVoteSchema>;
