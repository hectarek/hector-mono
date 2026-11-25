import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  NewUserGame,
  UserGame,
  UserGameChanges,
} from "@/src/entities/models/user-game.model";
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

  // One process, one test at a time: nothing to wait for.
  async lock(): Promise<void> {}

  async getById(id: string): Promise<UserGame | undefined> {
    const copy = this.rows.find((row) => row.id === id);
    return copy && { ...copy };
  }

  async listByIds(ids: readonly string[]): Promise<UserGame[]> {
    const wanted = new Set(ids);
    return this.rows
      .filter((copy) => wanted.has(copy.id))
      .sort(oldestFirst)
      .map((copy) => ({ ...copy }));
  }

  async listOwn(userId: string): Promise<UserGame[]> {
    return this.rows
      .filter((copy) => copy.userId === userId)
      .sort(oldestFirst)
      .map((copy) => ({ ...copy }));
  }

  async hasCopies(gameId: string): Promise<boolean> {
    return this.rows.some((copy) => copy.gameId === gameId);
  }

  async isInABox(gameId: string): Promise<boolean> {
    return this.expansions.some((boxed) => boxed.gameId === gameId);
  }

  // The table's defaults: in good condition, no note, lent.
  async add(copy: NewUserGame): Promise<UserGame> {
    const now = new Date();
    const added: UserGame = {
      id: crypto.randomUUID(),
      condition: "good",
      conditionNote: null,
      lendable: true,
      createdAt: now,
      updatedAt: now,
      ...copy,
    };
    this.rows.push(added);
    return { ...added };
  }

  async update(id: string, changes: UserGameChanges): Promise<UserGame> {
    const copy = this.rows.find((row) => row.id === id);
    if (!copy) {
      throw new DatabaseOperationError("update failed");
    }
    Object.assign(copy, changes, { updatedAt: new Date() });
    return { ...copy };
  }

  // As the database's cascade does for the box; the loans live in their own mock.
  async remove(id: string): Promise<void> {
    keepOnly(this.rows, (copy) => copy.id !== id);
    keepOnly(this.expansions, (boxed) => boxed.userGameId !== id);
  }

  async setExpansions(
    userGameId: string,
    gameIds: readonly string[],
  ): Promise<void> {
    keepOnly(this.expansions, (boxed) => boxed.userGameId !== userGameId);
    this.expansions.push(...gameIds.map((gameId) => ({ userGameId, gameId })));
  }

  async setPassAlongForAll(userId: string, passAlong: boolean): Promise<void> {
    const now = new Date();
    for (const copy of this.rows) {
      if (copy.userId === userId) {
        copy.passAlong = passAlong;
        copy.updatedAt = now;
      }
    }
  }
}

// Keeps the rows that pass, in place, since tests hold the arrays.
function keepOnly<T>(rows: T[], keep: (row: T) => boolean): void {
  const kept = rows.filter(keep);
  rows.length = 0;
  rows.push(...kept);
}
