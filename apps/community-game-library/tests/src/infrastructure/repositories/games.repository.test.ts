import { beforeEach, expect, it } from "bun:test";
import type { Game } from "@/src/entities/models/game.model";
import { toSearchTitle } from "@/src/entities/search-title";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { games } = CAST;
const titles = (found: Game[]) => found.map(({ title }) => title);

// A catalog game the cast doesn't have, with only what a test sets (ids end in 9xx).
function catalogGame(n: number, title: string, more: Partial<Game> = {}): Game {
  const added = new Date("2026-07-01T12:00:00-04:00");
  return {
    id: `00000000-0000-4000-8000-${String(900 + n).padStart(12, "0")}`,
    type: "base-game",
    baseGameId: null,
    title,
    searchTitle: toSearchTitle(title),
    year: null,
    publishers: null,
    designers: null,
    minPlayers: null,
    maxPlayers: null,
    bestPlayers: null,
    minMinutes: null,
    maxMinutes: null,
    minAge: null,
    complexity: null,
    categories: null,
    description: null,
    imageUrl: null,
    imageCredit: null,
    imageSourceUrl: null,
    videoUrl: null,
    popularity: null,
    createdAt: added,
    updatedAt: added,
    ...more,
  };
}

describeEachBackend("IGamesRepository", () => {
  let app: ReturnType<typeof makeApp>;
  const search = (typed: string, shelves: string[] = [], limit = 30) =>
    app.repos.games.search(toSearchTitle(typed), shelves, limit);

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("finds Ticket to Ride from ticket ride, a leading the, or a one-letter typo", async () => {
    await app.addGames(catalogGame(1, "Ticket to Ride"));

    for (const typed of [
      "ticket ride",
      "The Ticket to Ride",
      "ticket to rdie",
      "tickt to ride",
    ]) {
      expect(titles((await search(typed)).inCatalog)).toEqual([
        "Ticket to Ride",
      ]);
    }
    expect(await search("quarry tickets")).toEqual({
      onShelves: [],
      inCatalog: [],
    });
  });

  it("matches as the title is typed, from two letters", async () => {
    expect(titles((await search("ha")).inCatalog)).toEqual([
      "Harbor Lights",
      "Harbor Lights: Night Tide",
      "Harbor Master",
      "Safe Harbor",
    ]);
    expect(await search("h")).toEqual({ onShelves: [], inCatalog: [] });
    expect(await search("")).toEqual({ onShelves: [], inCatalog: [] });
  });

  it("puts the shelves' games first, then the rest of the catalog (B10)", async () => {
    const found = await search("harbor", [games.harborLights.id]);

    expect(titles(found.onShelves)).toEqual(["Harbor Lights"]);
    expect(titles(found.inCatalog)).toEqual([
      "Harbor Lights: Night Tide",
      "Harbor Master",
      "Safe Harbor",
    ]);
  });

  it("orders by closeness, then popularity, then title", async () => {
    await app.addGames(
      catalogGame(1, "Lantern Glow", { popularity: 10 }),
      catalogGame(2, "Lantern Row", { popularity: 500 }),
      catalogGame(3, "Lanterns", { popularity: 9999 }),
      catalogGame(4, "Lantern Bay"),
    );

    expect(titles((await search("lantern")).inCatalog)).toEqual([
      "Lantern Row",
      "Lantern Glow",
      "Lantern Bay",
      // Closer matches come before a more popular game that's further off.
      "Lanterns",
    ]);
  });

  it("returns at most the limit, shelves first", async () => {
    const found = await search("harbor", [games.harborLights.id], 2);

    expect(titles(found.onShelves)).toEqual(["Harbor Lights"]);
    expect(titles(found.inCatalog)).toEqual(["Harbor Lights: Night Tide"]);
  });

  it("reads a game by id, and several by title", async () => {
    expect(await app.repos.games.getById(games.nightTide.id)).toMatchObject({
      title: "Harbor Lights: Night Tide",
      type: "expansion",
      baseGameId: games.harborLights.id,
      year: 2021,
    });
    expect(
      await app.repos.games.getById("00000000-0000-4000-8000-000000000999"),
    ).toBeUndefined();
    expect(
      titles(
        await app.repos.games.listByIds([
          games.safeHarbor.id,
          games.harborLights.id,
        ]),
      ),
    ).toEqual(["Harbor Lights", "Safe Harbor"]);
    expect(await app.repos.games.listByIds([])).toEqual([]);
  });

  it("lists a base game's expansions", async () => {
    expect(
      titles(await app.repos.games.listExpansions(games.harborLights.id)),
    ).toEqual(["Harbor Lights: Night Tide"]);
    expect(await app.repos.games.listExpansions(games.nightMarket.id)).toEqual(
      [],
    );
  });
});
