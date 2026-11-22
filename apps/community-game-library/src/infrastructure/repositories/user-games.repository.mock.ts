import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { UserGameExpansion } from "@/src/entities/models/user-game-expansion.model";

// The real repository's orders: a timestamp, then the id; ids by code point.
const compare = (a: string | number, b: string | number) =>
  a < b ? -1 : a > b ? 1 : 0;
const oldestFirst = (a: UserGame, b: UserGame) =>
  compare(a.createdAt.getTime(), b.createdAt.getTime()) || compare(a.id, b.id);

export class MockUserGamesRepository implements IUserGamesRepository {
  // The copies and the expansions in their boxes that its reads see. Tests put them here
  // (makeCast, tests/_support/app.ts) until U7 gives copies their writes.
  readonly rows: UserGame[] = [];
  readonly expansions: UserGameExpansion[] = [];

  // Who's whose friend, as the real repository's join reads it.
  constructor(private readonly friendships: IFriendshipsRepository) {}

  async listVisible(viewerId: string): Promise<UserGame[]> {
    const owners = new Set([
      viewerId,
      ...(await this.friendships.listFriendIds(viewerId)),
    ]);
    return this.rows
      .filter((copy) => owners.has(copy.userId))
      .sort(oldestFirst)
      .map((copy) => ({ ...copy }));
  }

  async listVisibleForGame(
    gameId: string,
    viewerId: string,
  ): Promise<UserGame[]> {
    return (await this.listVisible(viewerId)).filter(
      (copy) => copy.gameId === gameId,
    );
  }

  async listExpansionsInBoxes(
    userGameIds: readonly string[],
  ): Promise<UserGameExpansion[]> {
    const copies = new Set(userGameIds);
    return this.expansions
      .filter((boxed) => copies.has(boxed.userGameId))
      .sort(
        (a, b) =>
          compare(a.userGameId, b.userGameId) || compare(a.gameId, b.gameId),
      )
      .map((boxed) => ({ ...boxed }));
  }
}
