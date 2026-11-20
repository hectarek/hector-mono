import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/src/infrastructure/db/schema";

// Either driver: Neon's HTTP driver on a deployment, PGlite in tests and local runs.
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

// Repositories ask for the database when they run, so a lazily seeded PGlite can stand in.
export type DatabaseProvider = () => Promise<Database>;
