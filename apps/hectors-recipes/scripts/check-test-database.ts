// Runs before the browser tests' dev server starts (playwright.config.ts), and stops it unless the
// database and auth it was given are the hectors-recipes-test Neon project (docs/ux-plan.md H24).
// The test database carries a comment naming it (COMMENT ON DATABASE); production's has none.
import { neon } from "@neondatabase/serverless";

const TEST_DATABASE_NOTE = "hectors-recipes-test";

// "ep-x-pooler.c-14.…" (database) and "ep-x.neonauth.c-14.…" (auth) both belong to "ep-x".
function endpointOf(url: string): string {
  return new URL(url).hostname.split(".")[0]?.replace(/-pooler$/, "") ?? "";
}

const databaseUrl = process.env.DATABASE_URL;
const authUrl = process.env.NEON_AUTH_BASE_URL;
if (!databaseUrl || !authUrl) {
  throw new Error(
    "Browser tests need DATABASE_URL and NEON_AUTH_BASE_URL from .env.test.",
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
    `DATABASE_URL isn't the ${TEST_DATABASE_NOTE} Neon project; browser tests never run against another database.`,
  );
}
