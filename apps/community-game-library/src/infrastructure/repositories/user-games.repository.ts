import { and, asc, eq, inArray, or } from "drizzle-orm";
import type { Database } from "@/db";
import { friendships, userGameExpansions, userGames } from "@/db/schema";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
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
}
