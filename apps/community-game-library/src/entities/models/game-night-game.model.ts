import { z } from "zod";

// A copy on a night's table (docs/data-model.md, game_night_games; R29, R32), brought by the host
// or someone going.
export const gameNightGameSchema = z.object({
  gameNightId: z.uuid(),
  userGameId: z.uuid(),
  createdAt: z.date(),
});
export type GameNightGame = z.infer<typeof gameNightGameSchema>;
