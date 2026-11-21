// Stops a run unless the database and auth in .env are the community-game-library-test Neon
// project (docs/build-plan.md KTD1), as recipes' and job-search's checks do. Run it before a
// command that writes to .env's database from a terminal, and U25's browser flows run it before
// their dev server starts. The test database carries a comment naming it (COMMENT ON DATABASE);
// production's has none.
import { neon } from "@neondatabase/serverless";

const TEST_DATABASE_NOTE = "community-game-library-test";

// "ep-x-pooler.c-14.…" (database) and "ep-x.neonauth.c-14.…" (auth) both belong to "ep-x".
function endpointOf(url: string): string {
  return new URL(url).hostname.split(".")[0]?.replace(/-pooler$/, "") ?? "";
}

const databaseUrl = process.env.DATABASE_URL;
const authUrl = process.env.NEON_AUTH_BASE_URL;
if (!databaseUrl || !authUrl) {
  throw new Error(
    "This check needs DATABASE_URL and NEON_AUTH_BASE_URL from .env.",
  );
}
if (endpointOf(databaseUrl) !== endpointOf(authUrl)) {
  throw new Error(
    "DATABASE_URL and NEON_AUTH_BASE_URL belong to different Neon endpoints; both must be the test project's.",
  );
}

const sql = neon(databaseUrl);
const [database] = await sql`
  select shobj_description(oid, 'pg_database') as note
  from pg_database where datname = current_database()`;
if (database?.note !== TEST_DATABASE_NOTE) {
  throw new Error(
    `DATABASE_URL isn't the ${TEST_DATABASE_NOTE} Neon project; nothing that runs after this check reaches another database.`,
  );
}
