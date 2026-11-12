import { afterEach, describe, expect, it } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import journal from "@/db/migrations/meta/_journal.json";
import { MIGRATIONS_FOLDER } from "@/scripts/lib/migrations";
import {
  checksMigrations,
  missingMigrations,
} from "@/scripts/require-migrations";

const JOURNAL_TAGS = journal.entries.map(({ tag }) => tag);

describe("checksMigrations", () => {
  it("checks Vercel's production builds", () => {
    expect(checksMigrations({ VERCEL_ENV: "production" })).toBe(true);
  });

  it.each([{ VERCEL_ENV: "preview" }, { VERCEL_ENV: "development" }, {}])(
    "skips a build in %p, which reads no database",
    (env) => {
      expect(checksMigrations(env)).toBe(false);
    },
  );
});

describe("missingMigrations", () => {
  // The app's real migrations, applied as drizzle applies them, on an in-memory Postgres.
  let client: PGlite;

  afterEach(async () => {
    await client.close();
  });

  async function migrated() {
    client = new PGlite();
    const db = drizzle({ client });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return db;
  }

  it("finds none on a database that has run the whole journal", async () => {
    expect(await missingMigrations(await migrated())).toEqual([]);
  });

  it("names the newest migrations a database hasn't run, in journal order", async () => {
    const db = await migrated();
    // As production stood when a deploy outran its migrations.
    await client.query(
      "delete from drizzle.__drizzle_migrations where id in (select id from drizzle.__drizzle_migrations order by created_at desc limit 2)",
    );

    expect(await missingMigrations(db)).toEqual(JOURNAL_TAGS.slice(-2));
  });

  it("names every migration on a database that has run none", async () => {
    client = new PGlite();

    expect(await missingMigrations(drizzle({ client }))).toEqual(JOURNAL_TAGS);
  });

  // Older code deployed again runs on a database migrated past it.
  it("ignores a migration the database records that the journal doesn't have", async () => {
    const db = await migrated();
    await client.query(
      "insert into drizzle.__drizzle_migrations (hash, created_at) values ('a-later-migrations-hash', 9999999999999)",
    );

    expect(await missingMigrations(db)).toEqual([]);
  });
});
