import { beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { getGameUseCase } from "@/src/application/use-cases/catalog/get-game.use-case";
import { searchGamesUseCase } from "@/src/application/use-cases/catalog/search-games.use-case";
import { toSearchTitle } from "@/src/entities/search-title";
import type { Database } from "@/src/infrastructure/db/database";
import * as schema from "@/src/infrastructure/db/schema";
import { seedGames } from "@/src/infrastructure/db/seed";
import { GamesRepository } from "@/src/infrastructure/repositories/games.repository";

describe("search title", () => {
  test("drops case, accents, punctuation and a leading article", () => {
    expect(toSearchTitle("The Castles of Burgundy")).toBe(
      "castles of burgundy",
    );
    expect(toSearchTitle("Café International")).toBe("cafe international");
    expect(toSearchTitle("Moss & Mortar")).toBe("moss mortar");
  });
});

describe("catalog use cases on PGlite", () => {
  let db: Database;

  beforeAll(async () => {
    const client = new PGlite({ extensions: { pg_trgm } });
    await client.exec(schema.CREATE_GAMES_SQL);
    db = drizzle({ client, schema });
    await seedGames(db);
  });

  const repository = () => new GamesRepository(async () => db);

  test("a missing word still finds the game", async () => {
    const search = searchGamesUseCase(repository());
    const results = await search({ query: "ticket ride" });
    expect(results[0]?.title).toBe("Ticket to Ride");
  });

  test("a leading article and a typo don't matter", async () => {
    const search = searchGamesUseCase(repository());
    expect((await search({ query: "salt raod" }))[0]?.title).toBe(
      "The Salt Road",
    );
    expect((await search({ query: "the harbor lights" }))[0]?.title).toBe(
      "Harbor Lights",
    );
  });

  test("an expansion is found with its type", async () => {
    const search = searchGamesUseCase(repository());
    const [nightTide] = await search({ query: "night tide" });
    expect(nightTide?.type).toBe("expansion");
  });

  test("nothing close returns no results", async () => {
    const search = searchGamesUseCase(repository());
    expect(await search({ query: "zzzz qqqq" })).toEqual([]);
  });

  test("a game loads by id, and a malformed id finds nothing", async () => {
    const [harbor] = await searchGamesUseCase(repository())({
      query: "harbor lights",
    });
    const getGame = getGameUseCase(repository());
    expect((await getGame(harbor?.id ?? ""))?.bestPlayers).toEqual([4]);
    expect(await getGame("not-a-uuid")).toBeUndefined();
  });
});
