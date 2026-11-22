import type { ITransaction } from "@/src/entities/models/transaction.model";
import type {
  NewUserGame,
  UserGame,
  UserGameChanges,
} from "@/src/entities/models/user-game.model";
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

  // One copy, whoever owns it: a use case checks it's the caller's before showing or changing it.
  getById(id: string, tx?: ITransaction): Promise<UserGame | undefined>;
  // The copy's row lock (select … for update), taken before any move of its loans (KTD6), so two
  // moves on one copy wait for each other.
  lock(id: string, tx: ITransaction): Promise<void>;
  // A member's own copies, oldest first (My library, U7).
  listOwn(userId: string, tx?: ITransaction): Promise<UserGame[]>;

  // The writes (U7), each inside the caller's transaction.
  add(copy: NewUserGame, tx: ITransaction): Promise<UserGame>;
  update(
    id: string,
    changes: UserGameChanges,
    tx: ITransaction,
  ): Promise<UserGame>;
  // The database takes its expansions, loans and place on nights' tables with it.
  remove(id: string, tx: ITransaction): Promise<void>;
  // Puts exactly these expansions in the copy's box.
  setExpansions(
    userGameId: string,
    gameIds: readonly string[],
    tx: ITransaction,
  ): Promise<void>;
  // Pass-along on or off for every copy a member owns (B6's switch).
  setPassAlongForAll(
    userId: string,
    passAlong: boolean,
    tx: ITransaction,
  ): Promise<void>;
}
