import { afterEach, describe, expect, it } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import journal from "@/db/migrations/meta/_journal.json";
import { type Terminal, typeKeys } from "@/scripts/lib/terminal";
import {
  confirmed,
  isTestDatabase,
  type Migration,
  migrateTarget,
  migrationPlan,
  urlRefusal,
} from "@/scripts/migrate-production";

// Fictional Neon addresses: .env's stands in for the test project's, the other for production's.
const ENV_URL =
  "postgresql://tester:test-secret@ep-example-123-pooler.c-1.us-east-1.aws.neon.tech/neondb?sslmode=require";
const OTHER_URL =
  "postgresql://owner:other-secret@ep-example-456.c-1.us-east-1.aws.neon.tech/neondb?sslmode=require";

function expectRefused(url: string): void {
  const refusal = urlRefusal(url, ENV_URL);
  expect(refusal).toBeString();
  // Compared without printing either: the reason never quotes a URL, its host or its password.
  expect(refusal).not.toContain("secret");
  expect(refusal).not.toContain("ep-example");
}

describe("urlRefusal", () => {
  it.each([
    "mysql://owner:other-secret@ep-example-456.c-1.us-east-1.aws.neon.tech/neondb",
    "https://ep-example-456.c-1.us-east-1.aws.neon.tech/neondb",
    "ep-example-456.c-1.us-east-1.aws.neon.tech",
    "psql 'postgresql://owner:other-secret@ep-example-456.c-1.us-east-1.aws.neon.tech/neondb'",
    "postgresql://",
    "",
  ])("refuses %p, which isn't a Postgres URL", (url) => {
    expectRefused(url);
  });

  it("refuses the URL .env holds, the test project's", () => {
    expectRefused(ENV_URL);
  });

  it("passes another postgres:// or postgresql:// URL", () => {
    expect(urlRefusal(OTHER_URL, ENV_URL)).toBeNull();
    expect(
      urlRefusal(OTHER_URL.replace("postgresql://", "postgres://"), ENV_URL),
    ).toBeNull();
  });

  it("passes a Postgres URL when .env has none", () => {
    expect(urlRefusal(OTHER_URL, undefined)).toBeNull();
  });
});

describe("isTestDatabase", () => {
  it("knows the test project by its database's comment", () => {
    expect(isTestDatabase("job-search-test")).toBe(true);
  });

  it.each([null, "", "another note"])(
    "takes a database commented %p for another project",
    (note) => {
      expect(isTestDatabase(note)).toBe(false);
    },
  );
});

describe("migrationPlan", () => {
  // A fictional journal of three migrations, a minute apart.
  const migrations: Migration[] = [
    { tag: "0000_activity", hash: "hash-0000", folderMillis: 1_000 },
    { tag: "0001_jobs", hash: "hash-0001", folderMillis: 61_000 },
    { tag: "0002_people", hash: "hash-0002", folderMillis: 121_000 },
  ];
  const tags = migrations.map(({ tag }) => tag);

  it("plans every migration when none is recorded", () => {
    expect(migrationPlan(migrations, [])).toEqual({
      applied: [],
      pending: tags,
      skipped: [],
      unknown: 0,
    });
  });

  it("plans the migrations newer than the newest recorded one", () => {
    expect(
      migrationPlan(migrations, [{ hash: "hash-0000", createdAt: 1_000 }]),
    ).toEqual({
      applied: ["0000_activity"],
      pending: ["0001_jobs", "0002_people"],
      skipped: [],
      unknown: 0,
    });
  });

  it("plans none when every migration is recorded", () => {
    const recorded = migrations.map(({ hash, folderMillis }) => ({
      hash,
      createdAt: folderMillis,
    }));
    expect(migrationPlan(migrations, recorded)).toEqual({
      applied: tags,
      pending: [],
      skipped: [],
      unknown: 0,
    });
  });

  it("names an unrecorded migration older than the newest recorded one, which drizzle skips", () => {
    // 0001 landed after 0002 had run, as when two branches each generate one.
    expect(
      migrationPlan(migrations, [
        { hash: "hash-0000", createdAt: 1_000 },
        { hash: "hash-0002", createdAt: 121_000 },
      ]),
    ).toEqual({
      applied: ["0000_activity", "0002_people"],
      pending: [],
      skipped: ["0001_jobs"],
      unknown: 0,
    });
  });

  it("counts recorded migrations the journal doesn't have", () => {
    expect(
      migrationPlan(migrations, [
        { hash: "another-apps-hash", createdAt: 500 },
      ]),
    ).toEqual({ applied: [], pending: tags, skipped: [], unknown: 1 });
  });
});

describe("migrateTarget", () => {
  // The app's real migrations, applied the way Hector's run applies them, on an in-memory Postgres.
  const MIGRATIONS_FOLDER = `${import.meta.dir}/../../db/migrations`;
  const JOURNAL_TAGS = journal.entries.map(({ tag }) => tag);
  const HOST = "ep-example-456.c-1.us-east-1.aws.neon.tech";

  let client: PGlite;

  afterEach(async () => {
    await client.close();
  });

  function freshTarget() {
    client = new PGlite();
    const db = drizzle({ client });
    let runs = 0;
    return {
      db,
      runs: () => runs,
      applyMigrations: async () => {
        runs += 1;
        await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
      },
    };
  }

  // A terminal that answers from a script and keeps what was printed, refused and asked.
  function scriptedTerminal(answers: string[] = []) {
    const printed: string[] = [];
    const refused: string[] = [];
    const asked: string[] = [];
    const terminal: Terminal = {
      print: (line) => {
        printed.push(line);
      },
      refuse: (reason) => {
        refused.push(reason);
        return 1;
      },
      ask: async (question) => {
        asked.push(question);
        return answers.shift() ?? null;
      },
    };
    return { terminal, printed, refused, asked };
  }

  async function migrationsTableExists(): Promise<boolean> {
    const { rows } = await client.query<{ present: boolean }>(
      "select to_regclass('drizzle.__drizzle_migrations') is not null as present",
    );
    return rows[0]?.present ?? false;
  }

  it("refuses the test project's database before showing or asking anything", async () => {
    const target = freshTarget();
    await client.exec(
      "do $$ begin execute format('comment on database %I is %L', current_database(), 'job-search-test'); end $$;",
    );
    const { terminal, printed, refused, asked } = scriptedTerminal(["migrate"]);

    expect(
      await migrateTarget(target.db, HOST, terminal, target.applyMigrations),
    ).toBe(1);
    expect(refused).toEqual([
      "That's the job-search-test project's database. Nothing changed.",
    ]);
    expect(printed).toEqual([]);
    expect(asked).toEqual([]);
    expect(target.runs()).toBe(0);
    expect(await migrationsTableExists()).toBe(false);
  });

  it("applies the journal once `migrate` is typed, and shows the result", async () => {
    const target = freshTarget();
    const { terminal, printed, refused, asked } = scriptedTerminal(["migrate"]);

    expect(
      await migrateTarget(target.db, HOST, terminal, target.applyMigrations),
    ).toBe(0);
    expect(refused).toEqual([]);
    expect(asked).toHaveLength(1);
    expect(target.runs()).toBe(1);
    expect(printed.slice(0, 5)).toEqual([
      `Target: ${HOST}, database postgres`,
      `Migrations in the journal: ${JOURNAL_TAGS.join(", ")}`,
      "Applied on the target: 0",
      `To apply: ${JOURNAL_TAGS.join(", ")}`,
      `Applied on the target: ${JOURNAL_TAGS.length} of ${JOURNAL_TAGS.length}`,
    ]);
    expect(printed[5]).toMatch(/^Tables in public: .*\bactivity\b/);
  });

  it.each(["yes", "Migrate", ""])(
    "stops on %p, with nothing changed",
    async (answer) => {
      const target = freshTarget();
      const { terminal, refused } = scriptedTerminal([answer]);

      expect(
        await migrateTarget(target.db, HOST, terminal, target.applyMigrations),
      ).toBe(1);
      expect(refused).toEqual(["Stopped. Nothing changed."]);
      expect(target.runs()).toBe(0);
      expect(await migrationsTableExists()).toBe(false);
    },
  );

  it("has nothing to apply on a target that's up to date, and asks nothing", async () => {
    const target = freshTarget();
    await migrate(target.db, { migrationsFolder: MIGRATIONS_FOLDER });
    const { terminal, printed, refused, asked } = scriptedTerminal(["migrate"]);

    expect(
      await migrateTarget(target.db, HOST, terminal, target.applyMigrations),
    ).toBe(0);
    expect(printed).toContain(`Applied on the target: ${JOURNAL_TAGS.length}`);
    expect(printed.at(-1)).toBe("Nothing to apply.");
    expect(refused).toEqual([]);
    expect(asked).toEqual([]);
    expect(target.runs()).toBe(0);
  });

  it("refuses a target that records migrations this journal doesn't have", async () => {
    const target = freshTarget();
    // Another drizzle app's database, pasted by mistake.
    await client.exec(`
      create schema drizzle;
      create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint);
      insert into drizzle.__drizzle_migrations (hash, created_at) values ('another-apps-hash', 1700000000000);`);
    const { terminal, refused, asked } = scriptedTerminal(["migrate"]);

    expect(
      await migrateTarget(target.db, HOST, terminal, target.applyMigrations),
    ).toBe(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toStartWith(
      "The target records 1 migration(s) this journal doesn't have",
    );
    expect(asked).toEqual([]);
    expect(target.runs()).toBe(0);
  });

  it("fails when a migration it listed is still unapplied afterwards", async () => {
    const target = freshTarget();
    const { terminal, refused } = scriptedTerminal(["migrate"]);

    // As if drizzle had skipped every migration without an error.
    expect(
      await migrateTarget(target.db, HOST, terminal, async () => undefined),
    ).toBe(1);
    expect(refused).toEqual([`Still not applied: ${JOURNAL_TAGS.join(", ")}.`]);
  });
});

describe("confirmed", () => {
  it("continues only on migrate", () => {
    expect(confirmed("migrate")).toBe(true);
  });

  it.each([
    "",
    "y",
    "yes",
    "Migrate",
    " migrate",
    "migrate ",
    "migrate now",
    null,
  ])("stops on %p", (answer) => {
    expect(confirmed(answer)).toBe(false);
  });
});

describe("typeKeys", () => {
  it("keeps the keys typed until Enter", () => {
    expect(typeKeys("post", "gres")).toEqual({ line: "postgres" });
  });

  it("ends the line at Enter and drops what came after it", () => {
    expect(typeKeys("", "postgres://x\r")).toEqual({
      line: "postgres://x",
      end: "enter",
    });
    expect(typeKeys("post", "gres\nmigrate")).toEqual({
      line: "postgres",
      end: "enter",
    });
  });

  it("deletes the last character on Backspace", () => {
    expect(typeKeys("postgres", "\u007f\u007f")).toEqual({ line: "postgr" });
    expect(typeKeys("p", "\b")).toEqual({ line: "" });
    expect(typeKeys("", "\u007f")).toEqual({ line: "" });
  });

  it("aborts on Ctrl-C", () => {
    expect(typeKeys("postgres", "\u0003").end).toBe("abort");
  });

  it("ignores other control keys", () => {
    expect(typeKeys("", "a\tb\u001b")).toEqual({ line: "ab" });
  });
});
