// Loads db/catalog.jsonl, the catalog's own dataset (docs/catalog-data.md, How it loads), into the
// games table (U24): each game whose id isn't there yet, base games before their expansions, with
// its search title, and every value the file lacks as null. Alone, it never changes a row already
// there, so the admin's corrections and the games added by hand stay, and a second run inserts
// nothing.
//
// With --update-from <commit>, it also brings the games already there up to the file. It names
// the commit whose file the database was last loaded or updated from, and a value changes only
// while it still holds what that file gave: a value the admin changed stays (planUpdate).
//
//   cd apps/community-game-library
//   bun scripts/load-catalog.ts                         # a dry run on .env's database, the test project's
//   bun scripts/load-catalog.ts --commit                # inserts there, in one transaction
//   bun scripts/load-catalog.ts --update-from 605c24d   # a dry run of inserting and updating
//   bun scripts/load-catalog.ts --production            # Hector's terminal: a dry run on production
//   bun scripts/load-catalog.ts --production --commit   # inserts there once he types "load"
//   bun scripts/load-catalog.ts --production --update-from 605c24d --commit   # once he types "update"
//
// Production's URL comes from a prompt that shows nothing as it's typed, as the production
// migration's does (KTD1), and nothing prints it or an error's message.
import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
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

type LoadArgs = {
  commit: boolean;
  production: boolean;
  // The commit whose db/catalog.jsonl the database holds, when the load updates too.
  updateFrom: string | null;
};

// The command line's flags, or why they can't be used.
export function parseArgs(argv: readonly string[]): LoadArgs | string {
  const args: LoadArgs = { commit: false, production: false, updateFrom: null };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--commit") {
      args.commit = true;
    } else if (flag === "--production") {
      args.production = true;
    } else if (flag === "--update-from") {
      const commit = argv[++index];
      if (commit === undefined || !/^[\w./-]+$/.test(commit)) {
        return "--update-from takes the commit the database was last loaded or updated from.";
      }
      args.updateFrom = commit;
    } else {
      return `Unknown option ${flag}: the load takes --commit, --production and --update-from <commit>.`;
    }
  }
  return args;
}

// One line of the file (scripts/lib/catalog.ts's CatalogGame). An unknown field stops the load, so
// a value the file gains is loaded on purpose rather than dropped. wikidataId and wikipediaFields
// say where the line came from, and aren't columns.
const counted = z.number().int().nonnegative();
const names = z.array(z.string().min(1)).min(1);
const link = z.string().regex(/^https:\/\/\S+$/);
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
  imageUrl: link.optional(),
  imageCredit: z.string().min(1).optional(),
  imageSourceUrl: link.optional(),
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
    const imageParts = [line.imageUrl, line.imageCredit, line.imageSourceUrl];
    if (new Set(imageParts.map((part) => part === undefined)).size > 1) {
      return `${where}: an image comes with its credit and its page.`;
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
      imageUrl: line.imageUrl ?? null,
      imageCredit: line.imageCredit ?? null,
      imageSourceUrl: line.imageSourceUrl ?? null,
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

// The columns an update may change: every one the file can give. A game's type and base game stay
// as first loaded, since turning a game into an expansion, or moving it to another base game,
// would leave the expansions in members' boxes under the wrong game.
const UPDATED_COLUMNS = [
  "title",
  "year",
  "publishers",
  "designers",
  "minPlayers",
  "maxPlayers",
  "bestPlayers",
  "minMinutes",
  "maxMinutes",
  "minAge",
  "complexity",
  "categories",
  "description",
  "imageUrl",
  "imageCredit",
  "imageSourceUrl",
  "videoUrl",
  "popularity",
] as const satisfies readonly (keyof CatalogRow)[];
type UpdatedColumn = (typeof UPDATED_COLUMNS)[number];

// Columns that change only together: an image and its credit (data-model.md, games). When the
// admin changed one of them, the update leaves them all.
const TOGETHER: readonly (readonly UpdatedColumn[])[] = [
  ["imageUrl", "imageCredit", "imageSourceUrl"],
];

export type GameUpdate = {
  id: string;
  title: string;
  set: Partial<Pick<CatalogRow, UpdatedColumn | "searchTitle">>;
};

export type UpdatePlan = {
  updates: GameUpdate[];
  filled: number;
  changed: number;
  cleared: number;
  // The games with a value the admin changed, which the update leaves as it is.
  kept: { title: string; columns: UpdatedColumn[] }[];
};

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// What an update does to the games already in the table: for each of the file's games there, each
// value that differs from the file changes when it still holds what the file at the last load or
// update gave (`previous`), so the admin's corrections stay. A game that file didn't have only
// gets its empty values filled. An image and its credit stay together (TOGETHER). Each change is a
// fill, a change or a clear.
export function planUpdate(
  rows: readonly CatalogRow[],
  previous: readonly CatalogRow[],
  existing: readonly Pick<CatalogRow, "id" | UpdatedColumn>[],
): UpdatePlan {
  const before = new Map(previous.map((row) => [row.id, row]));
  const there = new Map(existing.map((row) => [row.id, row]));
  const plan: UpdatePlan = {
    updates: [],
    filled: 0,
    changed: 0,
    cleared: 0,
    kept: [],
  };
  for (const row of rows) {
    const current = there.get(row.id);
    if (current === undefined) {
      continue;
    }
    const last = before.get(row.id);
    const differs = (column: UpdatedColumn) =>
      !same(current[column], row[column]);
    const held = new Set(
      UPDATED_COLUMNS.filter(
        (column) =>
          differs(column) &&
          !(last === undefined
            ? current[column] === null
            : same(current[column], last[column])),
      ),
    );
    for (const group of TOGETHER) {
      if (group.some((column) => held.has(column))) {
        for (const column of group.filter(differs)) {
          held.add(column);
        }
      }
    }
    const set: GameUpdate["set"] = {};
    const kept: UpdatedColumn[] = [];
    for (const column of UPDATED_COLUMNS) {
      const now = current[column];
      const next = row[column];
      if (!differs(column)) {
        continue;
      }
      if (held.has(column)) {
        kept.push(column);
        continue;
      }
      Object.assign(set, { [column]: next });
      if (now === null) {
        plan.filled++;
      } else if (next === null) {
        plan.cleared++;
      } else {
        plan.changed++;
      }
    }
    if (set.title !== undefined) {
      set.searchTitle = row.searchTitle;
    }
    if (Object.keys(set).length > 0) {
      plan.updates.push({ id: row.id, title: row.title, set });
    }
    if (kept.length > 0) {
      plan.kept.push({ title: current.title ?? row.title, columns: kept });
    }
  }
  return plan;
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

// Writes each update, its search title with its title; drizzle moves updated_at.
async function updateRows(
  tx: Transaction,
  updates: readonly GameUpdate[],
): Promise<number> {
  let updated = 0;
  for (const { id, set } of updates) {
    const written = await tx
      .update(schema.games)
      .set(set)
      .where(eq(schema.games.id, id))
      .returning({ id: schema.games.id });
    updated += written.length;
  }
  return updated;
}

// "Copper Kettle, The Lantern Row and 3 more".
function someTitles(titles: readonly string[], most = 10): string {
  const shown = titles.slice(0, most).join(", ");
  return titles.length > most
    ? `${shown} and ${titles.length - most} more`
    : shown;
}

// The load's steps on a target: the check that it's the database meant, the counts, and with
// `commit` the inserts, in one transaction, base games first so each expansion's game is there.
// Given the file the database was last loaded or updated from (`previous`), it updates the games
// already there too, in the same transaction. Production also waits for "load" to be typed, or
// "update" when it updates.
export async function loadCatalog(
  target: { db: Database; production: boolean },
  rows: readonly CatalogRow[],
  commit: boolean,
  terminal: Terminal,
  previous: readonly CatalogRow[] | null = null,
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

  const existing = await target.db.select().from(schema.games);
  const plan = planLoad(rows, new Set(existing.map((game) => game.id)));
  const toInsert = plan.baseGames.length + plan.expansions.length;
  terminal.print(
    `In db/catalog.jsonl: ${amount(rows.length, "game")}. Already in games: ${plan.there}.`,
  );
  terminal.print(
    `To insert: ${amount(plan.baseGames.length, "base game")} and ${amount(plan.expansions.length, "expansion")}.`,
  );
  // A game added by hand under a title the file also has would show twice in search. Only a game
  // the file lacks was added by hand: two of the file's games can share a title, as the two games
  // called Shogun do.
  const fileIds = new Set(rows.map((row) => row.id));
  const titlesByHand = new Set(
    existing
      .filter((game) => !fileIds.has(game.id))
      .map((game) => game.searchTitle),
  );
  const twice = [...plan.baseGames, ...plan.expansions].filter((row) =>
    titlesByHand.has(row.searchTitle),
  );
  if (twice.length > 0) {
    terminal.print(
      `Already in games under another id, so they'd show twice: ${twice.map((row) => row.title).join(", ")}.`,
    );
  }
  const update =
    previous === null ? null : planUpdate(rows, previous, existing);
  if (update !== null) {
    terminal.print(
      `To update: ${amount(update.updates.length, "game")}, with ${amount(update.filled, "value")} filled, ${update.changed} changed and ${update.cleared} cleared.`,
    );
    if (update.kept.length > 0) {
      terminal.print(
        `Kept as the admin left them: ${amount(update.kept.length, "game")} (${someTitles(update.kept.map(({ title }) => title))}).`,
      );
    }
  }
  const toUpdate = update?.updates.length ?? 0;
  if (toInsert + toUpdate === 0) {
    terminal.print(
      update === null ? "Nothing to insert." : "Nothing to insert or update.",
    );
    return 0;
  }
  if (!commit) {
    terminal.print(
      `A dry run, so nothing was written. With --commit, the load ${update === null ? "inserts them" : "inserts and updates them"}.`,
    );
    return 0;
  }
  const word = update === null ? "load" : "update";
  if (
    target.production &&
    (await terminal.ask(
      `Type "${word}" to ${update === null ? "insert them" : "insert and update them"}, anything else to stop: `,
    )) !== word
  ) {
    return terminal.refuse("Stopped. Nothing was written.");
  }

  const written = await target.db.transaction(async (tx) => ({
    inserted:
      (await insertRows(tx, plan.baseGames)) +
      (await insertRows(tx, plan.expansions)),
    updated: await updateRows(tx, update?.updates ?? []),
  }));
  terminal.print(
    update === null
      ? `Inserted ${amount(written.inserted, "game")}.`
      : `Inserted ${amount(written.inserted, "game")} and updated ${written.updated}.`,
  );
  return 0;
}

// "1 game", "2 games".
function amount(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// db/catalog.jsonl as it was at a commit, from git, or why it can't be read.
function catalogAt(commit: string): CatalogRow[] | string {
  const shown = Bun.spawnSync(["git", "show", `${commit}:./db/catalog.jsonl`], {
    cwd: new URL("..", import.meta.url).pathname,
  });
  if (shown.exitCode !== 0) {
    return `git has no db/catalog.jsonl at ${commit}.`;
  }
  const rows = readCatalog(shown.stdout.toString());
  return typeof rows === "string"
    ? `db/catalog.jsonl at ${commit} can't be read: ${rows}`
    : rows;
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
  const previous = args.updateFrom === null ? null : catalogAt(args.updateFrom);
  if (typeof previous === "string") {
    return refuse(previous);
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
    return loadCatalog(
      { db, production: false },
      rows,
      args.commit,
      terminal,
      previous,
    );
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
      previous,
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
