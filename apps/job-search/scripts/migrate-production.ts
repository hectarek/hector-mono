// Applies db/migrations to the production database from Hector's own terminal (docs/build-plan.md
// KTD17): `cd apps/job-search && bun run db:migrate:production`. The URL comes from a prompt that
// shows nothing as it's typed, never from a file, and nothing prints it or an error's message,
// which could quote it. It runs only in a terminal, but that isn't what keeps it Hector's (Claude's
// desktop terminal tool has one): only he has the production URL, and only he types `migrate`.
import { Pool } from "@neondatabase/serverless";
import { type SQL, sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import journal from "@/db/migrations/meta/_journal.json";
import { ask, print, refuse, type Terminal } from "@/scripts/lib/terminal";
import { loggable } from "@/src/entities/errors/loggable";

// The test project's database carries this comment (scripts/check-test-database.ts checks it);
// production's has none.
const TEST_DATABASE_NOTE = "job-search-test";
const MIGRATIONS_FOLDER = `${import.meta.dir}/../db/migrations`;

// A journal entry as drizzle's migrator sees it: the hash it records once the migration has run,
// and the journal's `when`, which it compares with the newest recorded migration.
export type Migration = { tag: string; hash: string; folderMillis: number };

// A row of drizzle's migrations table.
export type Recorded = { hash: string; createdAt: number };

// The one drizzle method the wrapper uses, so a test can hand it PGlite. Its rows come back
// untyped, and each read checks the fields it uses.
type Database = {
  execute(query: SQL): PromiseLike<{ rows: Record<string, unknown>[] }>;
};

// Why the URL typed can't be the target, or null when it can. Bun loads .env, which holds the test
// project's URL; the reason quotes neither.
export function urlRefusal(
  url: string,
  envUrl: string | undefined,
): string | null {
  const parsed = URL.parse(url);
  if (
    !parsed?.hostname ||
    !["postgres:", "postgresql:"].includes(parsed.protocol)
  ) {
    return "That isn't a postgres:// or postgresql:// URL. Nothing changed.";
  }
  if (url === envUrl) {
    return "That's the URL in .env, the test project's. Nothing changed.";
  }
  return null;
}

export function isTestDatabase(note: string | null): boolean {
  return note === TEST_DATABASE_NOTE;
}

// What drizzle's migrate() will do on a target (drizzle-orm 0.45's pg dialect): run, in journal
// order, each migration newer than the newest one recorded. An unrecorded migration that isn't
// newer is skipped without an error. `unknown` counts recorded migrations this journal doesn't
// have: another app's database, or a migration file edited after it ran.
export function migrationPlan(
  migrations: readonly Migration[],
  recorded: readonly Recorded[],
): {
  applied: string[];
  pending: string[];
  skipped: string[];
  unknown: number;
} {
  const recordedHashes = new Set(recorded.map((row) => row.hash));
  const journalHashes = new Set(migrations.map((migration) => migration.hash));
  // -Infinity when nothing is recorded, so every migration is newer.
  const newest = Math.max(...recorded.map((row) => row.createdAt));
  const applied: string[] = [];
  const pending: string[] = [];
  const skipped: string[] = [];
  for (const { tag, hash, folderMillis } of migrations) {
    if (recordedHashes.has(hash)) {
      applied.push(tag);
    } else if (folderMillis > newest) {
      pending.push(tag);
    } else {
      skipped.push(tag);
    }
  }
  const unknown = recorded.filter((row) => !journalHashes.has(row.hash));
  return { applied, pending, skipped, unknown: unknown.length };
}

export function confirmed(answer: string | null): boolean {
  return answer === "migrate";
}

// The journal's migrations, hashed by drizzle's own reader, so they match what migrate() records.
function journalMigrations(): Migration[] {
  const files = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  return journal.entries.map(({ tag }, index) => {
    const file = files[index];
    if (!file) {
      throw new Error("The journal lists more migrations than drizzle read");
    }
    return { tag, hash: file.hash, folderMillis: file.folderMillis };
  });
}

// drizzle's migrations table, or no rows before a first migration creates it.
async function recordedMigrations(db: Database): Promise<Recorded[]> {
  const {
    rows: [table],
  } = await db.execute(
    sql`select to_regclass('drizzle.__drizzle_migrations') is not null as present`,
  );
  if (table?.present !== true) {
    return [];
  }
  // created_at is a bigint, which Neon's driver returns as a string and PGlite as a number.
  const { rows } = await db.execute(
    sql`select hash, created_at from drizzle.__drizzle_migrations`,
  );
  return rows.map((row) => ({
    hash: String(row.hash),
    createdAt: Number(row.created_at),
  }));
}

export async function migrateTarget(
  db: Database,
  host: string,
  terminal: Terminal,
  applyMigrations: () => Promise<unknown>,
): Promise<number> {
  const {
    rows: [database],
  } = await db.execute(sql`
    select datname as name, shobj_description(oid, 'pg_database') as note
    from pg_database where datname = current_database()`);
  if (
    isTestDatabase(typeof database?.note === "string" ? database.note : null)
  ) {
    return terminal.refuse(
      `That's the ${TEST_DATABASE_NOTE} project's database. Nothing changed.`,
    );
  }

  const migrations = journalMigrations();
  const plan = migrationPlan(migrations, await recordedMigrations(db));
  terminal.print(`Target: ${host}, database ${String(database?.name)}`);
  terminal.print(
    `Migrations in the journal: ${migrations.map(({ tag }) => tag).join(", ")}`,
  );
  terminal.print(`Applied on the target: ${plan.applied.length}`);
  if (plan.unknown > 0) {
    return terminal.refuse(
      `The target records ${plan.unknown} migration(s) this journal doesn't have: another app's database, or a migration file edited after it ran. Nothing changed.`,
    );
  }
  if (plan.skipped.length > 0) {
    return terminal.refuse(
      `drizzle would skip ${plan.skipped.join(", ")}, older than the newest migration the target records. Nothing changed.`,
    );
  }
  if (plan.pending.length === 0) {
    terminal.print("Nothing to apply.");
    return 0;
  }
  terminal.print(`To apply: ${plan.pending.join(", ")}`);
  const answer = await terminal.ask(
    'Type "migrate" to apply them, anything else to stop: ',
  );
  if (!confirmed(answer)) {
    return terminal.refuse("Stopped. Nothing changed.");
  }

  await applyMigrations();
  const after = migrationPlan(migrations, await recordedMigrations(db));
  const missing = [...after.pending, ...after.skipped];
  if (missing.length > 0) {
    return terminal.refuse(`Still not applied: ${missing.join(", ")}.`);
  }
  const { rows: tables } = await db.execute(
    sql`select tablename as name from pg_tables where schemaname = 'public' order by tablename`,
  );
  terminal.print(
    `Applied on the target: ${after.applied.length} of ${migrations.length}`,
  );
  terminal.print(
    `Tables in public: ${tables.map((table) => String(table.name)).join(", ") || "none"}`,
  );
  return 0;
}

async function main(): Promise<number> {
  if (!(process.stdin.isTTY && process.stdout.isTTY)) {
    return refuse("Run this in your own terminal.");
  }
  const url = (
    await ask("Production database URL (hidden as you type): ", false)
  )?.trim();
  if (url === undefined) {
    return refuse("Stopped. Nothing changed.");
  }
  const refusal = urlRefusal(url, process.env.DATABASE_URL);
  if (refusal) {
    return refuse(refusal);
  }

  const pool = new Pool({ connectionString: url });
  // An idle connection that drops is the pool's to replace, and the next query reports any
  // failure that matters. Unheard, this event would crash with the error's message.
  pool.on("error", () => undefined);
  const db = drizzle({ client: pool });
  try {
    return await migrateTarget(
      db,
      URL.parse(url)?.hostname ?? "",
      { print, refuse, ask: (question) => ask(question, true) },
      () => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    );
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  const code = await main().catch((err: unknown) => {
    // KTD20: an error's message can quote the host or a value, so only its class and code.
    const { errorClass, errorCode } = loggable(err);
    return refuse(`Failed: ${errorClass}${errorCode ? ` ${errorCode}` : ""}.`);
  });
  process.exit(code);
}
