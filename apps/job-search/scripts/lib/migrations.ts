// The journal's migrations and the ones a database records, as drizzle's migrator reads them. The
// production migration wrapper and the production build's check share these.
import { type SQL, sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import journal from "@/db/migrations/meta/_journal.json";

export const MIGRATIONS_FOLDER = `${import.meta.dir}/../../db/migrations`;

// A journal entry as drizzle's migrator sees it: the hash it records once the migration has run,
// and the journal's `when`, which it compares with the newest recorded migration.
export type Migration = { tag: string; hash: string; folderMillis: number };

// A row of drizzle's migrations table.
export type Recorded = { hash: string; createdAt: number };

// The one drizzle method these reads use, so a test can hand them PGlite. Its rows come back
// untyped, and each read checks the fields it uses.
export type Database = {
  execute(query: SQL): PromiseLike<{ rows: Record<string, unknown>[] }>;
};

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

// The journal's migrations, hashed by drizzle's own reader, so they match what migrate() records.
export function journalMigrations(): Migration[] {
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
export async function recordedMigrations(db: Database): Promise<Recorded[]> {
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
