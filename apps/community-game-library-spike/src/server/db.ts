import "server-only";
import { env } from "virtual:solid-env/server";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import type { Database } from "@/src/infrastructure/db/database";
import * as schema from "@/src/infrastructure/db/schema";
import { seedGames } from "@/src/infrastructure/db/seed";

let database: Promise<Database> | undefined;

// The Neon database when DATABASE_URL is set; otherwise PGlite in memory, made and seeded
// on first use, so the spike runs with no Neon project.
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
  const client = new PGlite({ extensions: { pg_trgm } });
  await client.exec(schema.CREATE_GAMES_SQL);
  const db = drizzlePglite({ client, schema });
  await seedGames(db);
  return db;
}
