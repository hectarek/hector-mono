// Runs before every test file (bunfig.toml [test].preload).
import { mock } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";

// Bun loads .env for tests too. Drop the real credentials so no test can reach the live
// database or auth service, and so tests behave the same with or without a .env.
for (const key of [
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
]) {
  delete process.env[key];
}

// The transaction manager (and the real repository, if a test uses it) talks to an
// in-memory Postgres, never Neon. It starts with no tables: stash has no migrations to apply.
mock.module("@/db", () => ({
  db: drizzle({ client: new PGlite(), schema }),
}));
