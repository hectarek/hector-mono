import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { db } from "@/db";
import { games } from "@/db/schema";
import type { Terminal } from "@/scripts/lib/terminal";
import {
  type CatalogRow,
  loadCatalog,
  parseArgs,
  planLoad,
  planUpdate,
  readCatalog,
} from "@/scripts/load-catalog";
import { resetDatabase, sql } from "@/tests/_support/database";

// Three fictional games in the file's form (R45): two base games, and an expansion listed first,
// which the real file never does, so the load's own order is what's tested.
const KETTLE = "1f6a2c3e-4b5d-5e6f-8a7b-9c0d1e2f3a4b";
const LANTERN = "2a7b3d4f-5c6e-5f70-9b8c-0d1e2f3a4b5c";
const SECOND_BREW = "3b8c4e5a-6d7f-5a81-8c9d-1e2f3a4b5c6d";

const LINES = {
  secondBrew: {
    id: SECOND_BREW,
    wikidataId: "Q9000003",
    type: "expansion",
    baseGameId: KETTLE,
    title: "Copper Kettle: Second Brew",
    year: 2021,
    popularity: 2,
  },
  kettle: {
    id: KETTLE,
    wikidataId: "Q9000001",
    type: "base-game",
    title: "Copper Kettle",
    year: 2019,
    publishers: ["Tin Lid Games"],
    designers: ["Wren Ashby"],
    minPlayers: 2,
    maxPlayers: 4,
    minMinutes: 30,
    maxMinutes: 45,
    minAge: 10,
    categories: ["Family"],
    popularity: 9,
    wikipediaFields: ["minAge"],
  },
  lantern: {
    id: LANTERN,
    wikidataId: "Q9000002",
    type: "base-game",
    title: "The Lantern Row",
    popularity: 4,
  },
};

const fileOf = (...lines: object[]): string =>
  `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`;

const CATALOG = fileOf(LINES.secondBrew, LINES.kettle, LINES.lantern);

// The file a later run makes: Copper Kettle gains a publisher and loses its age, and The Lantern
// Row gains a designer and some popularity.
const NEXT_CATALOG = fileOf(
  LINES.secondBrew,
  {
    ...LINES.kettle,
    publishers: ["Tin Lid Games", "Brass Spout"],
    minAge: undefined,
  },
  { ...LINES.lantern, designers: ["Ines Varga"], popularity: 5 },
);

function rowsOf(text: string): CatalogRow[] {
  const rows = readCatalog(text);
  if (typeof rows === "string") {
    throw new Error(rows);
  }
  return rows;
}

function scriptedTerminal(answer: string | null = null) {
  const lines: string[] = [];
  const refusals: string[] = [];
  const asked: string[] = [];
  const terminal: Terminal = {
    print: (line) => {
      lines.push(line);
    },
    refuse: (reason) => {
      refusals.push(reason);
      return 1;
    },
    ask: async (question) => {
      asked.push(question);
      return answer;
    },
  };
  return { terminal, lines, refusals, asked };
}

describe("parseArgs", () => {
  it("dry-runs on .env's database unless told otherwise", () => {
    expect(parseArgs([])).toEqual({
      commit: false,
      production: false,
      updateFrom: null,
    });
    expect(parseArgs(["--production", "--commit"])).toEqual({
      commit: true,
      production: true,
      updateFrom: null,
    });
  });

  it("updates from the commit it's given", () => {
    expect(parseArgs(["--update-from", "605c24d", "--commit"])).toEqual({
      commit: true,
      production: false,
      updateFrom: "605c24d",
    });
    expect(parseArgs(["--update-from"])).toContain(
      "--update-from takes the commit",
    );
  });

  it("refuses an option it doesn't take", () => {
    expect(parseArgs(["--commit", "--force"])).toContain(
      "Unknown option --force",
    );
  });
});

describe("readCatalog", () => {
  it("turns each line into a games row, with its search title and every missing value null", () => {
    const rows = readCatalog(`\n${CATALOG}\n`);

    expect(rows).toEqual([
      {
        id: SECOND_BREW,
        type: "expansion",
        baseGameId: KETTLE,
        title: "Copper Kettle: Second Brew",
        searchTitle: "copper kettle second brew",
        year: 2021,
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
        videoUrl: null,
        popularity: 2,
      },
      {
        id: KETTLE,
        type: "base-game",
        baseGameId: null,
        title: "Copper Kettle",
        searchTitle: "copper kettle",
        year: 2019,
        publishers: ["Tin Lid Games"],
        designers: ["Wren Ashby"],
        minPlayers: 2,
        maxPlayers: 4,
        bestPlayers: null,
        minMinutes: 30,
        maxMinutes: 45,
        minAge: 10,
        complexity: null,
        categories: ["Family"],
        description: null,
        imageUrl: null,
        videoUrl: null,
        popularity: 9,
      },
      expect.objectContaining({
        id: LANTERN,
        title: "The Lantern Row",
        searchTitle: "lantern row",
        year: null,
        popularity: 4,
      }),
    ]);
  });

  it.each([
    ["a line that isn't JSON", "{", "Line 1 isn't JSON."],
    [
      "a field the load doesn't know",
      fileOf({ ...LINES.lantern, complexity: "light" }),
      "Line 1 isn't a game the load knows (complexity).",
    ],
    [
      "an id that isn't a UUID",
      fileOf({ ...LINES.lantern, id: "lantern-row" }),
      "Line 1 isn't a game the load knows (id).",
    ],
    [
      "a repeated id",
      fileOf(LINES.kettle, { ...LINES.lantern, id: KETTLE }),
      "Line 2 repeats an earlier line's id.",
    ],
    [
      "a base game with a base game",
      fileOf(LINES.kettle, { ...LINES.lantern, baseGameId: KETTLE }),
      "Line 2: an expansion has a base game, and only an expansion does.",
    ],
    [
      "an expansion without one",
      fileOf({ ...LINES.secondBrew, baseGameId: undefined }),
      "Line 1: an expansion has a base game, and only an expansion does.",
    ],
    [
      "an expansion of a game the file lacks",
      fileOf(LINES.secondBrew, LINES.lantern),
      "Copper Kettle: Second Brew expands a game that isn't a base game in the file.",
    ],
  ])("refuses %s", (_case, text, reason) => {
    expect(readCatalog(text)).toBe(reason);
  });
});

describe("planLoad", () => {
  it("puts the base games before the expansions and counts the games already there", () => {
    const rows = readCatalog(CATALOG);
    if (typeof rows === "string") {
      throw new Error(rows);
    }

    const plan = planLoad(rows, new Set([LANTERN]));

    expect(plan.baseGames.map((row) => row.id)).toEqual([KETTLE]);
    expect(plan.expansions.map((row) => row.id)).toEqual([SECOND_BREW]);
    expect(plan.there).toBe(1);
  });
});

describe("planUpdate", () => {
  it("fills, changes and clears what the last file gave, and keeps what the admin changed", () => {
    const loaded = rowsOf(CATALOG);
    const there = loaded.map((row) =>
      row.id === KETTLE
        ? { ...row, designers: ["Wren Ashby", "Ida Kell"] }
        : row.id === LANTERN
          ? { ...row, complexity: "light" as const }
          : row,
    );

    const plan = planUpdate(rowsOf(NEXT_CATALOG), loaded, there);

    expect(plan.updates).toEqual([
      {
        id: KETTLE,
        title: "Copper Kettle",
        set: { publishers: ["Tin Lid Games", "Brass Spout"], minAge: null },
      },
      {
        id: LANTERN,
        title: "The Lantern Row",
        set: { designers: ["Ines Varga"], popularity: 5 },
      },
    ]);
    expect([plan.filled, plan.changed, plan.cleared]).toEqual([1, 2, 1]);
    expect(plan.kept).toEqual([
      { title: "Copper Kettle", columns: ["designers"] },
      { title: "The Lantern Row", columns: ["complexity"] },
    ]);
  });

  it("only fills the empty values of a game the last file didn't have", () => {
    const loaded = rowsOf(fileOf(LINES.kettle, LINES.lantern));
    const brew = rowsOf(CATALOG).find((row) => row.id === SECOND_BREW);
    if (brew === undefined) {
      throw new Error("no Second Brew");
    }

    const plan = planUpdate(
      rowsOf(fileOf(LINES.secondBrew, LINES.kettle, LINES.lantern)).map(
        (row) =>
          row.id === SECOND_BREW ? { ...row, designers: ["Wren Ashby"] } : row,
      ),
      loaded,
      [...loaded, { ...brew, year: 2020 }],
    );

    expect(plan.updates).toEqual([
      {
        id: SECOND_BREW,
        title: "Copper Kettle: Second Brew",
        set: { designers: ["Wren Ashby"] },
      },
    ]);
    expect(plan.kept).toEqual([
      { title: "Copper Kettle: Second Brew", columns: ["year"] },
    ]);
  });

  it("changes a title with its search title", () => {
    const loaded = rowsOf(CATALOG);
    const plan = planUpdate(
      rowsOf(fileOf({ ...LINES.lantern, title: "Lantern Row" })),
      loaded,
      loaded,
    );
    expect(plan.updates).toEqual([
      {
        id: LANTERN,
        title: "Lantern Row",
        set: { title: "Lantern Row", searchTitle: "lantern row" },
      },
    ]);
  });
});

describe("loadCatalog", () => {
  // The test project's database carries this comment, and production's none.
  async function commentDatabase(note: string | null): Promise<void> {
    const [database] = await sql<{ name: string }>(
      "select current_database() as name",
    );
    await sql(
      `comment on database "${database?.name}" is ${note === null ? "null" : `'${note}'`}`,
    );
  }

  const gameRows = () =>
    sql<{ id: string; title: string; complexity: string | null }>(
      `select id, title, complexity from games order by title collate "C"`,
    );

  const onTest = { db, production: false };
  const onProduction = { db, production: true };

  beforeEach(async () => {
    await resetDatabase();
    await commentDatabase("community-game-library-test");
  });
  afterEach(() => commentDatabase(null));

  it.each([null, "hectors-recipes-test"])(
    "stops on a database whose comment is %p, and writes nothing",
    async (note) => {
      await commentDatabase(note);
      const run = scriptedTerminal();

      expect(
        await loadCatalog(onTest, rowsOf(CATALOG), true, run.terminal),
      ).toBe(1);
      expect(run.refusals).toEqual([
        "DATABASE_URL isn't the community-game-library-test Neon project's database, so the load stops. Nothing was written.",
      ]);
      expect(await gameRows()).toEqual([]);
    },
  );

  it("says what a dry run would insert, and writes nothing", async () => {
    const run = scriptedTerminal();

    expect(
      await loadCatalog(onTest, rowsOf(CATALOG), false, run.terminal),
    ).toBe(0);
    expect(run.lines).toEqual([
      "In db/catalog.jsonl: 3 games. Already in games: 0.",
      "To insert: 2 base games and 1 expansion.",
      "A dry run, so nothing was written. With --commit, the load inserts them.",
    ]);
    expect(await gameRows()).toEqual([]);
  });

  it("inserts every game with --commit, the expansion after its base game, and a second run inserts nothing", async () => {
    const first = scriptedTerminal();
    expect(
      await loadCatalog(onTest, rowsOf(CATALOG), true, first.terminal),
    ).toBe(0);
    expect(first.lines.at(-1)).toBe("Inserted 3 games.");
    const [brew] = await sql<{
      base_game_id: string;
      search_title: string;
      best_players: number[] | null;
    }>(
      "select base_game_id, search_title, best_players from games where id = $1",
      [SECOND_BREW],
    );
    expect(brew).toEqual({
      base_game_id: KETTLE,
      search_title: "copper kettle second brew",
      best_players: null,
    });

    const second = scriptedTerminal();
    expect(
      await loadCatalog(onTest, rowsOf(CATALOG), true, second.terminal),
    ).toBe(0);
    expect(second.lines).toEqual([
      "In db/catalog.jsonl: 3 games. Already in games: 3.",
      "To insert: 0 base games and 0 expansions.",
      "Nothing to insert.",
    ]);
    expect(await gameRows()).toHaveLength(3);
  });

  it("leaves a row already there as the admin left it, and names a title added by hand", async () => {
    await db.insert(games).values([
      {
        id: KETTLE,
        type: "base-game",
        title: "Copper Kettle, Second Edition",
        searchTitle: "copper kettle second edition",
        complexity: "medium",
      },
      {
        id: "4c9d5f6b-7e8a-4b92-9dae-2f3a4b5c6d7e",
        type: "base-game",
        title: "Lantern Row",
        searchTitle: "lantern row",
      },
    ]);
    const run = scriptedTerminal();

    expect(await loadCatalog(onTest, rowsOf(CATALOG), true, run.terminal)).toBe(
      0,
    );
    expect(run.lines).toEqual([
      "In db/catalog.jsonl: 3 games. Already in games: 1.",
      "To insert: 1 base game and 1 expansion.",
      "Already in games under another id, so they'd show twice: The Lantern Row.",
      "Inserted 2 games.",
    ]);
    expect(await gameRows()).toEqual([
      {
        id: KETTLE,
        title: "Copper Kettle, Second Edition",
        complexity: "medium",
      },
      expect.objectContaining({ title: "Copper Kettle: Second Brew" }),
      expect.objectContaining({ title: "Lantern Row" }),
      expect.objectContaining({ id: LANTERN, title: "The Lantern Row" }),
    ]);
  });

  it("doesn't name a game that shares its title with another of the file's games", async () => {
    await loadCatalog(
      onTest,
      rowsOf(CATALOG),
      true,
      scriptedTerminal().terminal,
    );
    const namesake = {
      id: "5d0e6f7a-8b9c-5d01-9e2f-3a4b5c6d7e8f",
      wikidataId: "Q9000004",
      type: "base-game",
      title: "Copper Kettle",
      year: 1987,
      popularity: 1,
    };
    const run = scriptedTerminal();

    expect(
      await loadCatalog(
        onTest,
        rowsOf(fileOf(LINES.secondBrew, LINES.kettle, LINES.lantern, namesake)),
        true,
        run.terminal,
      ),
    ).toBe(0);
    expect(run.lines).toEqual([
      "In db/catalog.jsonl: 4 games. Already in games: 3.",
      "To insert: 1 base game and 0 expansions.",
      "Inserted 1 game.",
    ]);
  });

  it("refuses the test project's database as production", async () => {
    const run = scriptedTerminal("load");

    expect(
      await loadCatalog(onProduction, rowsOf(CATALOG), true, run.terminal),
    ).toBe(1);
    expect(run.refusals).toEqual([
      "That's the community-game-library-test project's database. Nothing was written.",
    ]);
    expect(run.asked).toEqual([]);
    expect(await gameRows()).toEqual([]);
  });

  it.each([
    ["yes", 0],
    [null, 0],
    ["load", 3],
  ])(
    "on production, inserts only once load is typed (typed %p)",
    async (answer, inserted) => {
      await commentDatabase(null);
      const run = scriptedTerminal(answer);

      expect(
        await loadCatalog(onProduction, rowsOf(CATALOG), true, run.terminal),
      ).toBe(inserted > 0 ? 0 : 1);
      expect(run.asked).toEqual([
        'Type "load" to insert them, anything else to stop: ',
      ]);
      expect(await gameRows()).toHaveLength(inserted);
    },
  );

  it("updates the games already there from the file they were loaded from, and keeps the admin's values", async () => {
    const loaded = rowsOf(CATALOG);
    await loadCatalog(onTest, loaded, true, scriptedTerminal().terminal);
    await sql("update games set designers = $1 where id = $2", [
      ["Wren Ashby", "Ida Kell"],
      KETTLE,
    ]);

    const dry = scriptedTerminal();
    expect(
      await loadCatalog(
        onTest,
        rowsOf(NEXT_CATALOG),
        false,
        dry.terminal,
        loaded,
      ),
    ).toBe(0);
    expect(dry.lines).toEqual([
      "In db/catalog.jsonl: 3 games. Already in games: 3.",
      "To insert: 0 base games and 0 expansions.",
      "To update: 2 games, with 1 value filled, 2 changed and 1 cleared.",
      "Kept as the admin left them: 1 game (Copper Kettle).",
      "A dry run, so nothing was written. With --commit, the load inserts and updates them.",
    ]);

    const run = scriptedTerminal();
    expect(
      await loadCatalog(
        onTest,
        rowsOf(NEXT_CATALOG),
        true,
        run.terminal,
        loaded,
      ),
    ).toBe(0);
    expect(run.lines.at(-1)).toBe("Inserted 0 games and updated 2.");
    expect(
      await sql(
        "select title, publishers, designers, min_age, popularity from games where id in ($1, $2) order by title",
        [KETTLE, LANTERN],
      ),
    ).toEqual([
      {
        title: "Copper Kettle",
        publishers: ["Tin Lid Games", "Brass Spout"],
        designers: ["Wren Ashby", "Ida Kell"],
        min_age: null,
        popularity: 9,
      },
      {
        title: "The Lantern Row",
        publishers: null,
        designers: ["Ines Varga"],
        min_age: null,
        popularity: 5,
      },
    ]);

    const again = scriptedTerminal();
    await loadCatalog(
      onTest,
      rowsOf(NEXT_CATALOG),
      true,
      again.terminal,
      rowsOf(NEXT_CATALOG),
    );
    expect(again.lines.at(-1)).toBe("Nothing to insert or update.");
  });

  it.each([
    ["load", 0],
    ["update", 2],
  ])(
    "on production, updates only once update is typed (typed %p)",
    async (answer, updated) => {
      const loaded = rowsOf(CATALOG);
      await loadCatalog(onTest, loaded, true, scriptedTerminal().terminal);
      await commentDatabase(null);
      const run = scriptedTerminal(answer);

      await loadCatalog(
        onProduction,
        rowsOf(NEXT_CATALOG),
        true,
        run.terminal,
        loaded,
      );
      expect(run.asked).toEqual([
        'Type "update" to insert and update them, anything else to stop: ',
      ]);
      const [lantern] = await sql<{ popularity: number }>(
        "select popularity from games where id = $1",
        [LANTERN],
      );
      expect(lantern?.popularity).toBe(updated > 0 ? 5 : 4);
    },
  );

  it("asks nothing on a production dry run", async () => {
    await commentDatabase(null);
    const run = scriptedTerminal("load");

    expect(
      await loadCatalog(onProduction, rowsOf(CATALOG), false, run.terminal),
    ).toBe(0);
    expect(run.asked).toEqual([]);
    expect(await gameRows()).toEqual([]);
  });
});
