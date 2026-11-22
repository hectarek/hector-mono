import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { UserGameExpansion } from "@/src/entities/models/user-game-expansion.model";

// Copies on members' shelves (docs/data-model.md, user_games and user_game_expansions), read for
// one member: only their own copies and their friends' ever load, so a stranger's never do
// (KTD4). U7 adds the writes.
export interface IUserGamesRepository {
  // Every copy the viewer may see, their own and their friends', oldest first: search's first
  // group (R2) and, from U8, the library.
  listVisible(viewerId: string, tx?: ITransaction): Promise<UserGame[]>;
  // A game's copies the viewer may see, oldest first.
  listVisibleForGame(
    gameId: string,
    viewerId: string,
    tx?: ITransaction,
  ): Promise<UserGame[]>;
  // The expansions in these copies' boxes, for copies the caller may already see.
  listExpansionsInBoxes(
    userGameIds: readonly string[],
    tx?: ITransaction,
  ): Promise<UserGameExpansion[]>;
}
