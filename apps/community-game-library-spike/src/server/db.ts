import "server-only";
import { env } from "virtual:solid-env/server";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { Database } from "@/src/infrastructure/db/database";
import * as schema from "@/src/infrastructure/db/schema";

let database: Promise<Database> | undefined;

// The Neon database when DATABASE_URL is set; otherwise PGlite in memory, made and seeded
// on first use, so the spike runs with no Neon project. PGlite loads only in that case, so
// a deployed server never reads its 9 MB engine.
export function getDatabase(): Promise<Database> {
  database ??= env.DATABASE_URL
    ? Promise.resolve(neonDatabase(env.DATABASE_URL))
    : seededPglite();
  return database;
}

function neonDatabase(url: string): Database {
  return drizzleNeon({ client: neon(url), schema });
}

async function seededPglite(): Promise<Database> {
  const [{ PGlite }, { pg_trgm }, { drizzle }, { seedGames }] =
    await Promise.all([
      import("@electric-sql/pglite"),
      import("@electric-sql/pglite/contrib/pg_trgm"),
      import("drizzle-orm/pglite"),
      import("@/src/infrastructure/db/seed"),
    ]);
  const client = new PGlite({ extensions: { pg_trgm } });
  await client.exec(schema.CREATE_GAMES_SQL);
  const db = drizzle({ client, schema });
  await seedGames(db);
  return db;
}
