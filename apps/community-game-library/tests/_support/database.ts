// An in-memory Postgres (PGlite) standing in for Neon. preload.ts points "@/db" at it, so the
// real repositories and transaction manager run against real SQL, with the app's own
// migrations, and never against a real database. Recipes' harness.
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

// An empty in-memory Postgres with the extension the migrations load: pg_trgm, from PGlite's
// contrib, for search (KTD10). The migration scripts' tests make their own.
export function newPGlite(): PGlite {
  return new PGlite({ extensions: { pg_trgm } });
}

const client = newPGlite();
export const testDb = drizzle({ client, schema });

let migrated: Promise<void> | undefined;

function migrateOnce(): Promise<void> {
  migrated ??= migrate(testDb, {
    migrationsFolder: `${import.meta.dir}/../../db/migrations`,
  });
  return migrated;
}

// Call in beforeEach: migrates on first use, then empties every table the migrations made. It
// finds them itself, so a new table needs no line here: job-search's list missed one, and its
// rows carried over from test to test on Postgres alone (2026-10-29).
export async function resetDatabase(): Promise<void> {
  await migrateOnce();
  const { rows } = await client.query<{ name: string }>(
    "select quote_ident(tablename) as name from pg_tables where schemaname = 'public'",
  );
  if (rows.length > 0) {
    await client.exec(
      `truncate ${rows.map(({ name }) => name).join(", ")} restart identity cascade;`,
    );
  }
}

// Raw SQL for a test's own setup and checks. Never inside an open transaction: PGlite has one
// connection, so it would wait forever.
export async function sql<T>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await client.query<T>(query, params)).rows;
}
