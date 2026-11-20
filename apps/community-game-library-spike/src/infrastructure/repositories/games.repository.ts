import { desc, eq, sql } from "drizzle-orm";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { Game } from "@/src/entities/game";
import type { DatabaseProvider } from "@/src/infrastructure/db/database";
import { games } from "@/src/infrastructure/db/schema";

// KTD10: a word similarity above this keeps "ticket ride" matching Ticket to Ride.
const MIN_SIMILARITY = 0.3;

export class GamesRepository implements IGamesRepository {
  constructor(private readonly database: DatabaseProvider) {}

  async search(searchTitle: string, limit: number): Promise<Game[]> {
    const db = await this.database();
    const score = sql<number>`word_similarity(${searchTitle}, ${games.searchTitle})`;
    const rows = await db
      .select()
      .from(games)
      .where(sql`${score} >= ${MIN_SIMILARITY}`)
      .orderBy(
        desc(score),
        sql`${games.popularity} desc nulls last`,
        games.title,
      )
      .limit(limit);
    return rows.map(toGame);
  }

  async getById(id: string): Promise<Game | undefined> {
    const db = await this.database();
    const [row] = await db
      .select()
      .from(games)
      .where(eq(games.id, id))
      .limit(1);
    return row ? toGame(row) : undefined;
  }
}

function toGame(row: typeof games.$inferSelect): Game {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    year: row.year,
    publishers: row.publishers,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    bestPlayers: row.bestPlayers,
    minMinutes: row.minMinutes,
    maxMinutes: row.maxMinutes,
    minAge: row.minAge,
    complexity: row.complexity,
    description: row.description,
    popularity: row.popularity,
  };
}
