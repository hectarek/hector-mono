import { asc, eq, inArray, type SQL, sql } from "drizzle-orm";
import { games } from "@/db/schema";
import type {
  GameSearchResults,
  IGamesRepository,
} from "@/src/application/repositories/games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { Game, GameRecord } from "@/src/entities/models/game.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { SEARCH_MATCH_ABOVE, toSearchTitle } from "@/src/entities/search-title";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

// Titles in code-point order, so the mock's order is the database's whatever its collation.
const byTitle = sql`${games.searchTitle} collate "C"`;

export class GamesRepository
  extends BaseRepository
  implements IGamesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "games");
  }

  async search(
    searchTitle: string,
    shelfGameIds: readonly string[],
    limit: number,
    tx?: ITransaction,
  ): Promise<GameSearchResults> {
    if (searchTitle === "") {
      return { onShelves: [], inCatalog: [] };
    }
    try {
      const closeness = sql<number>`word_similarity(${searchTitle}, ${games.searchTitle})`;
      const hasShelves = shelfGameIds.length > 0;
      const onShelves: SQL<boolean> = hasShelves
        ? sql<boolean>`${inArray(games.id, [...shelfGameIds])}`
        : sql<boolean>`false`;
      const rows = await this.getDbContext(tx)
        .select({ game: games, onShelves })
        .from(games)
        .where(sql`${closeness} > ${SEARCH_MATCH_ABOVE}`)
        .orderBy(
          // Postgres refuses a constant here, so the shelves order only when there are some.
          ...(hasShelves ? [sql`${onShelves} desc`] : []),
          sql`${closeness} desc`,
          sql`${games.popularity} desc nulls last`,
          byTitle,
          asc(games.id),
        )
        .limit(limit);
      return {
        onShelves: rows.filter((row) => row.onShelves).map((row) => row.game),
        inCatalog: rows.filter((row) => !row.onShelves).map((row) => row.game),
      };
    } catch (err) {
      this.handleError(err, "search");
    }
  }

  async getById(id: string, tx?: ITransaction): Promise<Game | undefined> {
    try {
      const [game] = await this.getDbContext(tx)
        .select()
        .from(games)
        .where(eq(games.id, id))
        .limit(1);
      return game;
    } catch (err) {
      this.handleError(err, "getById", { id });
    }
  }

  async listByIds(ids: readonly string[], tx?: ITransaction): Promise<Game[]> {
    if (ids.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select()
        .from(games)
        .where(inArray(games.id, [...ids]))
        .orderBy(byTitle, asc(games.id));
    } catch (err) {
      this.handleError(err, "listByIds");
    }
  }

  async listExpansions(baseGameId: string, tx?: ITransaction): Promise<Game[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(games)
        .where(eq(games.baseGameId, baseGameId))
        .orderBy(byTitle, asc(games.id));
    } catch (err) {
      this.handleError(err, "listExpansions", { baseGameId });
    }
  }

  async add(game: GameRecord, tx: ITransaction): Promise<Game> {
    try {
      const [added] = await this.getDbContext(tx)
        .insert(games)
        .values({ ...game, searchTitle: toSearchTitle(game.title) })
        .returning();
      if (!added) {
        throw new DatabaseOperationError("add failed");
      }
      return added;
    } catch (err) {
      this.handleError(err, "add");
    }
  }

  async update(id: string, game: GameRecord, tx: ITransaction): Promise<Game> {
    try {
      const [updated] = await this.getDbContext(tx)
        .update(games)
        .set({ ...game, searchTitle: toSearchTitle(game.title) })
        .where(eq(games.id, id))
        .returning();
      if (!updated) {
        throw new DatabaseOperationError("update failed");
      }
      return updated;
    } catch (err) {
      this.handleError(err, "update", { id });
    }
  }
}
