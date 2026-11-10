// Stops a production deploy whose code needs a migration production's database doesn't have yet.
// The app's build runs it before next build, so on Vercel a failed check fails the build and the
// live deploy keeps serving: apply the migration, then redeploy. hectarek/hector-mono#92 and #107
// each deployed before their migration ran, and the pages that read the new columns failed until
// it did (2026-11-07, 2026-11-10). Preview and local builds skip it and read no database. It
// prints migration tags only: never the database's address, and never an error's message, which
// could quote it (docs/build-plan.md KTD20).
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import {
  type Database,
  journalMigrations,
  recordedMigrations,
} from "@/scripts/lib/migrations";
import { print, refuse } from "@/scripts/lib/terminal";
import { loggable } from "@/src/entities/errors/loggable";

// Only Vercel's production builds check. Turborepo passes VERCEL_ENV to the build by default
// (2.11, checked 2026-11-10); the app's turbo.json lists it with the other variables the build
// reads, so one environment's cached build never stands in for another's.
export function checksMigrations(
  env: Record<string, string | undefined>,
): boolean {
  return env.VERCEL_ENV === "production";
}

// The journal's migrations the database hasn't recorded, in journal order. A migration it records
// that the journal doesn't have is no reason to stop: older code deployed again runs on a database
// migrated past it, since migrations only add before the code that needs them ships.
export async function missingMigrations(db: Database): Promise<string[]> {
  const recorded = new Set(
    (await recordedMigrations(db)).map(({ hash }) => hash),
  );
  return journalMigrations()
    .filter(({ hash }) => !recorded.has(hash))
    .map(({ tag }) => tag);
}

async function main(): Promise<number> {
  if (!checksMigrations(process.env)) {
    print("Not a production build, so the migration check is skipped.");
    return 0;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    return refuse(
      "This production build has no DATABASE_URL, so it can't check the database's migrations.",
    );
  }
  const pool = new Pool({ connectionString: url });
  // An idle connection that drops is the pool's to replace, and the query reports any failure
  // that matters. Unheard, this event would crash with the error's message.
  pool.on("error", () => undefined);
  try {
    const missing = await missingMigrations(drizzle({ client: pool }));
    if (missing.length > 0) {
      return refuse(
        `Production's database lacks ${missing.join(", ")}, which this code needs. Apply ${missing.length === 1 ? "it" : "them"} first (apps/job-search/AGENTS.md, Environments), then redeploy. The live deploy keeps serving.`,
      );
    }
    print("Production's database has every migration this code needs.");
    return 0;
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  const code = await main().catch((err: unknown) => {
    const { errorClass, errorCode } = loggable(err);
    return refuse(
      `The migration check failed: ${errorClass}${errorCode ? ` ${errorCode}` : ""}. The live deploy keeps serving.`,
    );
  });
  process.exit(code);
}
