import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { Database } from "@/db";
import { friendships, userGameExpansions, userGames } from "@/db/schema";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type {
  NewUserGame,
  UserGame,
  UserGameChanges,
} from "@/src/entities/models/user-game.model";
import type { UserGameExpansion } from "@/src/entities/models/user-game-expansion.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class UserGamesRepository
  extends BaseRepository
  implements IUserGamesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "user_games");
  }

  // The copies whose owner is the viewer or one of their friends.
  private visibleTo(db: Database, viewerId: string) {
    return or(
      eq(userGames.userId, viewerId),
      inArray(
        userGames.userId,
        db
          .select({ friendUserId: friendships.friendUserId })
          .from(friendships)
          .where(eq(friendships.userId, viewerId)),
      ),
    );
  }

  async listVisible(viewerId: string, tx?: ITransaction): Promise<UserGame[]> {
    try {
      const db = this.getDbContext(tx);
      return await db
        .select()
        .from(userGames)
        .where(this.visibleTo(db, viewerId))
        .orderBy(asc(userGames.createdAt), asc(userGames.id));
    } catch (err) {
      this.handleError(err, "listVisible");
    }
  }

  async listVisibleForGame(
    gameId: string,
    viewerId: string,
    tx?: ITransaction,
  ): Promise<UserGame[]> {
    try {
      const db = this.getDbContext(tx);
      return await db
        .select()
        .from(userGames)
        .where(and(eq(userGames.gameId, gameId), this.visibleTo(db, viewerId)))
        .orderBy(asc(userGames.createdAt), asc(userGames.id));
    } catch (err) {
      this.handleError(err, "listVisibleForGame", { gameId });
    }
  }

  async listExpansionsInBoxes(
    userGameIds: readonly string[],
    tx?: ITransaction,
  ): Promise<UserGameExpansion[]> {
    if (userGameIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(userGameExpansions)
        .where(inArray(userGameExpansions.userGameId, [...userGameIds]))
        .orderBy(
          asc(userGameExpansions.userGameId),
          asc(userGameExpansions.gameId),
        );
    } catch (err) {
      this.handleError(err, "listExpansionsInBoxes");
    }
  }

  async lock(id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .select({ id: userGames.id })
        .from(userGames)
        .where(eq(userGames.id, id))
        .for("update");
    } catch (err) {
      this.handleError(err, "lock", { id });
    }
  }

  async getById(id: string, tx?: ITransaction): Promise<UserGame | undefined> {
    try {
      const [copy] = await this.getDbContext(tx)
        .select()
        .from(userGames)
        .where(eq(userGames.id, id))
        .limit(1);
      return copy;
    } catch (err) {
      this.handleError(err, "getById", { id });
    }
  }

  async listOwn(userId: string, tx?: ITransaction): Promise<UserGame[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(userGames)
        .where(eq(userGames.userId, userId))
        .orderBy(asc(userGames.createdAt), asc(userGames.id));
    } catch (err) {
      this.handleError(err, "listOwn");
    }
  }

  async add(copy: NewUserGame, tx: ITransaction): Promise<UserGame> {
    try {
      const [added] = await this.getDbContext(tx)
        .insert(userGames)
        .values(copy)
        .returning();
      if (!added) {
        throw new DatabaseOperationError("add failed");
      }
      return added;
    } catch (err) {
      this.handleError(err, "add", { gameId: copy.gameId });
    }
  }

  async update(
    id: string,
    changes: UserGameChanges,
    tx: ITransaction,
  ): Promise<UserGame> {
    try {
      const [updated] = await this.getDbContext(tx)
        .update(userGames)
        .set(changes)
        .where(eq(userGames.id, id))
        .returning();
      if (!updated) {
        throw new DatabaseOperationError("update failed");
      }
      return updated;
    } catch (err) {
      this.handleError(err, "update", { id });
    }
  }

  async remove(id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx).delete(userGames).where(eq(userGames.id, id));
    } catch (err) {
      this.handleError(err, "remove", { id });
    }
  }

  async setExpansions(
    userGameId: string,
    gameIds: readonly string[],
    tx: ITransaction,
  ): Promise<void> {
    try {
      const db = this.getDbContext(tx);
      await db
        .delete(userGameExpansions)
        .where(eq(userGameExpansions.userGameId, userGameId));
      if (gameIds.length > 0) {
        await db
          .insert(userGameExpansions)
          .values(gameIds.map((gameId) => ({ userGameId, gameId })));
      }
    } catch (err) {
      this.handleError(err, "setExpansions", { userGameId });
    }
  }

  async setPassAlongForAll(
    userId: string,
    passAlong: boolean,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(userGames)
        .set({ passAlong })
        .where(eq(userGames.userId, userId));
    } catch (err) {
      this.handleError(err, "setPassAlongForAll");
    }
  }
}
