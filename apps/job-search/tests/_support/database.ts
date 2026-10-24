// An in-memory Postgres (PGlite) standing in for Neon. preload.ts points "@/db" at it, so the
// real repositories and transaction manager run against real SQL, with the app's own
// migrations, and never against a real database. Recipes' harness, for this app's tables.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

const client = new PGlite();
export const testDb = drizzle({ client, schema });

let migrated: Promise<void> | undefined;

function migrateOnce(): Promise<void> {
  migrated ??= migrate(testDb, {
    migrationsFolder: `${import.meta.dir}/../../db/migrations`,
  });
  return migrated;
}

// Call in beforeEach: migrates on first use, then empties every table.
export async function resetDatabase(): Promise<void> {
  await migrateOnce();
  await client.exec("truncate activity restart identity;");
}

// Raw SQL for a test's own setup and checks. Never inside an open transaction: PGlite has one
// connection, so it would wait forever.
export async function sql<T>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await client.query<T>(query, params)).rows;
}
