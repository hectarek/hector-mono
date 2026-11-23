// Loads db/catalog.jsonl, the catalog's own dataset (docs/catalog-data.md, How it loads), into the
// games table (U24): each game whose id isn't there yet, base games before their expansions, with
// its search title, and every value the file lacks as null. It never changes a row already there,
// so the admin's corrections and the games added by hand stay, and a second run inserts nothing.
//
//   cd apps/community-game-library
//   bun scripts/load-catalog.ts                         # a dry run on .env's database, the test project's
//   bun scripts/load-catalog.ts --commit                # inserts there, in one transaction
//   bun scripts/load-catalog.ts --production            # Hector's terminal: a dry run on production
//   bun scripts/load-catalog.ts --production --commit   # inserts there once he types "load"
//
// Production's URL comes from a prompt that shows nothing as it's typed, as the production
// migration's does (KTD1), and nothing prints it or an error's message.
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { z } from "zod";
import { type Database, db } from "@/db";
import * as schema from "@/db/schema";
import {
  databaseNote,
  isTestDatabase,
  TEST_DATABASE_NOTE,
  urlRefusal,
} from "@/scripts/lib/target-database";
import { ask, print, refuse, type Terminal } from "@/scripts/lib/terminal";
import { loggable } from "@/src/entities/errors/loggable";
import { GAME_TYPES, type Game } from "@/src/entities/models/game.model";
import { toSearchTitle } from "@/src/entities/search-title";

const CATALOG_FILE = new URL("../db/catalog.jsonl", import.meta.url);

// Rows a statement inserts at once: 20 values each, well under Postgres's 65,535 parameters.
const BATCH = 500;

// A games row as the load writes it; the database sets the timestamps.
export type CatalogRow = Omit<Game, "createdAt" | "updatedAt">;

type LoadArgs = { commit: boolean; production: boolean };

// The command line's flags, or why they can't be used.
export function parseArgs(argv: readonly string[]): LoadArgs | string {
  const args: LoadArgs = { commit: false, production: false };
  for (const flag of argv) {
    if (flag === "--commit") {
      args.commit = true;
    } else if (flag === "--production") {
      args.production = true;
    } else {
      return `Unknown option ${flag}: the load takes --commit and --production.`;
    }
  }
  return args;
}

// One line of the file (scripts/lib/catalog.ts's CatalogGame). An unknown field stops the load, so
// a value the file gains is loaded on purpose rather than dropped. wikidataId and wikipediaFields
// say where the line came from, and aren't columns.
const counted = z.number().int().nonnegative();
const names = z.array(z.string().min(1)).min(1);
const catalogLine = z.strictObject({
  id: z.uuid(),
  wikidataId: z.string().regex(/^Q\d+$/),
  type: z.enum(GAME_TYPES),
  baseGameId: z.uuid().optional(),
  title: z.string().min(1),
  year: z.number().int().optional(),
  publishers: names.optional(),
  designers: names.optional(),
  minPlayers: counted.optional(),
  maxPlayers: counted.optional(),
  minMinutes: counted.optional(),
  maxMinutes: counted.optional(),
  minAge: counted.optional(),
  categories: names.optional(),
  popularity: counted,
  wikipediaFields: z.array(z.string()).optional(),
});

// The file's games as games rows, in the file's order, or why the file can't be loaded.
export function readCatalog(text: string): CatalogRow[] | string {
  const rows: CatalogRow[] = [];
  const typeOf = new Map<string, CatalogRow["type"]>();
  for (const [index, raw] of text.split("\n").entries()) {
    if (raw.trim() === "") {
      continue;
    }
    const where = `Line ${index + 1}`;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return `${where} isn't JSON.`;
    }
    const parsed = catalogLine.safeParse(json);
    if (!parsed.success) {
      const fields = parsed.error.issues.flatMap((issue) =>
        issue.code === "unrecognized_keys"
          ? issue.keys
          : [issue.path.join(".") || "the line"],
      );
      return `${where} isn't a game the load knows (${fields.join(", ")}).`;
    }
    const line = parsed.data;
    if (typeOf.has(line.id)) {
      return `${where} repeats an earlier line's id.`;
    }
    if ((line.type === "expansion") !== (line.baseGameId !== undefined)) {
      return `${where}: an expansion has a base game, and only an expansion does.`;
    }
    typeOf.set(line.id, line.type);
    rows.push({
      id: line.id,
      type: line.type,
      baseGameId: line.baseGameId ?? null,
      title: line.title,
      searchTitle: toSearchTitle(line.title),
      year: line.year ?? null,
      publishers: line.publishers ?? null,
      designers: line.designers ?? null,
      minPlayers: line.minPlayers ?? null,
      maxPlayers: line.maxPlayers ?? null,
      bestPlayers: null,
      minMinutes: line.minMinutes ?? null,
      maxMinutes: line.maxMinutes ?? null,
      minAge: line.minAge ?? null,
      complexity: null,
      categories: line.categories ?? null,
      description: null,
      imageUrl: null,
      videoUrl: null,
      popularity: line.popularity,
    });
  }
  const orphan = rows.find(
    (row) => row.baseGameId && typeOf.get(row.baseGameId) !== "base-game",
  );
  if (orphan) {
    return `${orphan.title} expands a game that isn't a base game in the file.`;
  }
  return rows;
}

// What a load does to a table holding the games `ids` names: the file's base games and expansions
// it lacks, each in the file's order, and how many of the file's games it has already.
export function planLoad(
  rows: readonly CatalogRow[],
  ids: ReadonlySet<string>,
): { baseGames: CatalogRow[]; expansions: CatalogRow[]; there: number } {
  const missing = rows.filter((row) => !ids.has(row.id));
  return {
    baseGames: missing.filter((row) => row.type === "base-game"),
    expansions: missing.filter((row) => row.type === "expansion"),
    there: rows.length - missing.length,
  };
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// Inserts the rows in batches, skipping an id another run put in meanwhile, and counts what went in.
async function insertRows(
  tx: Transaction,
  rows: readonly CatalogRow[],
): Promise<number> {
  let inserted = 0;
  for (let start = 0; start < rows.length; start += BATCH) {
    const written = await tx
      .insert(schema.games)
      .values(rows.slice(start, start + BATCH))
      .onConflictDoNothing({ target: schema.games.id })
      .returning({ id: schema.games.id });
    inserted += written.length;
  }
  return inserted;
}

// The load's steps on a target: the check that it's the database meant, the counts, and with
// `commit` the inserts, in one transaction, base games first so each expansion's game is there.
// Production also waits for "load" to be typed.
export async function loadCatalog(
  target: { db: Database; production: boolean },
  rows: readonly CatalogRow[],
  commit: boolean,
  terminal: Terminal,
): Promise<number> {
  const testDatabase = isTestDatabase(await databaseNote(target.db));
  if (target.production && testDatabase) {
    return terminal.refuse(
      `That's the ${TEST_DATABASE_NOTE} project's database. Nothing was written.`,
    );
  }
  if (!(target.production || testDatabase)) {
    return terminal.refuse(
      `DATABASE_URL isn't the ${TEST_DATABASE_NOTE} Neon project's database, so the load stops. Nothing was written.`,
    );
  }

  const existing = await target.db
    .select({ id: schema.games.id, searchTitle: schema.games.searchTitle })
    .from(schema.games);
  const plan = planLoad(rows, new Set(existing.map((game) => game.id)));
  const toInsert = plan.baseGames.length + plan.expansions.length;
  terminal.print(
    `In db/catalog.jsonl: ${amount(rows.length, "game")}. Already in games: ${plan.there}.`,
  );
  terminal.print(
    `To insert: ${amount(plan.baseGames.length, "base game")} and ${amount(plan.expansions.length, "expansion")}.`,
  );
  // A game added by hand under a title the file also has would show twice in search.
  const titlesThere = new Set(existing.map((game) => game.searchTitle));
  const twice = [...plan.baseGames, ...plan.expansions].filter((row) =>
    titlesThere.has(row.searchTitle),
  );
  if (twice.length > 0) {
    terminal.print(
      `Already in games under another id, so they'd show twice: ${twice.map((row) => row.title).join(", ")}.`,
    );
  }
  if (toInsert === 0) {
    terminal.print("Nothing to insert.");
    return 0;
  }
  if (!commit) {
    terminal.print(
      "A dry run, so nothing was written. With --commit, the load inserts them.",
    );
    return 0;
  }
  if (
    target.production &&
    (await terminal.ask(
      'Type "load" to insert them, anything else to stop: ',
    )) !== "load"
  ) {
    return terminal.refuse("Stopped. Nothing was written.");
  }

  const inserted = await target.db.transaction(
    async (tx) =>
      (await insertRows(tx, plan.baseGames)) +
      (await insertRows(tx, plan.expansions)),
  );
  terminal.print(`Inserted ${amount(inserted, "game")}.`);
  return 0;
}

// "1 game", "2 games".
function amount(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args === "string") {
    return refuse(args);
  }
  const rows = readCatalog(await Bun.file(CATALOG_FILE).text());
  if (typeof rows === "string") {
    return refuse(`db/catalog.jsonl can't be loaded: ${rows}`);
  }
  const terminal = {
    print,
    refuse,
    ask: (question: string) => ask(question, true),
  };
  if (!args.production) {
    if (!process.env.DATABASE_URL) {
      return refuse("The load writes to .env's DATABASE_URL, which isn't set.");
    }
    return loadCatalog({ db, production: false }, rows, args.commit, terminal);
  }

  if (!(process.stdin.isTTY && process.stdout.isTTY)) {
    return refuse("Run this in your own terminal.");
  }
  const url = (
    await ask("Production database URL (hidden as you type): ", false)
  )?.trim();
  if (url === undefined) {
    return refuse("Stopped. Nothing was written.");
  }
  const refusal = urlRefusal(url, process.env.DATABASE_URL);
  if (refusal) {
    return refuse(refusal);
  }
  const pool = new Pool({ connectionString: url });
  // An idle connection that drops is the pool's to replace, and the next query reports any failure
  // that matters. Unheard, this event would crash with the error's message.
  pool.on("error", () => undefined);
  try {
    return await loadCatalog(
      { db: drizzle({ client: pool, schema }), production: true },
      rows,
      args.commit,
      terminal,
    );
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  const code = await main().catch((err: unknown) => {
    // KTD1: an error's message can quote the host or a value, so only its class and code.
    const { errorClass, errorCode } = loggable(err);
    return refuse(
      `The load failed: ${errorClass}${errorCode ? ` ${errorCode}` : ""}. Nothing was written.`,
    );
  });
  process.exit(code);
}
