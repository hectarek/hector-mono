// Which database a script reaches (docs/build-plan.md KTD1). The test project's carries a comment
// naming it (COMMENT ON DATABASE), as scripts/check-test-database.ts checks it, and production's
// has none. The seed, the catalog's load and the production migration share these.
import { sql } from "drizzle-orm";
import type { Database } from "@/scripts/lib/migrations";

export const TEST_DATABASE_NOTE = "community-game-library-test";

export function isTestDatabase(note: string | null): boolean {
  return note === TEST_DATABASE_NOTE;
}

// The comment on the database `db` reaches, or null when it has none.
export async function databaseNote(db: Database): Promise<string | null> {
  const {
    rows: [database],
  } = await db.execute(sql`
    select shobj_description(oid, 'pg_database') as note
    from pg_database where datname = current_database()`);
  return typeof database?.note === "string" ? database.note : null;
}

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
