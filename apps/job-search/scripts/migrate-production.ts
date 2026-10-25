// Applies db/migrations to the production database from Hector's own terminal (docs/build-plan.md
// KTD17): `cd apps/job-search && bun run db:migrate:production`. The URL comes from a prompt that
// shows nothing as it's typed, never from a file, and nothing prints it or an error's message,
// which could quote it. Claude's shell has no terminal, so Claude can't run this.
import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import journal from "@/db/migrations/meta/_journal.json";
import { loggable } from "@/src/entities/errors/loggable";

// The test project's database carries this comment (scripts/check-test-database.ts checks it);
// production's has none.
const TEST_DATABASE_NOTE = "job-search-test";
const MIGRATIONS_FOLDER = `${import.meta.dir}/../db/migrations`;

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

export function isTestDatabase(note: string | null): boolean {
  return note === TEST_DATABASE_NOTE;
}

// Drizzle applies the journal's migrations in order and records each as a row, so the first
// `appliedRows` are in. No migrations table (null) means none are.
export function pendingSummary(
  tags: readonly string[],
  appliedRows: number | null,
): { applied: number; pending: string[] } {
  const applied = appliedRows ?? 0;
  return { applied, pending: tags.slice(applied) };
}

export function confirmed(answer: string | null): boolean {
  return answer === "migrate";
}

// What a chunk of raw-mode keys does to the line typed so far: Enter ends it, Ctrl-C aborts it,
// Backspace deletes a character and any other control key does nothing.
export function typeKeys(
  line: string,
  keys: string,
): { line: string; end?: "enter" | "abort" } {
  let typed = line;
  for (const key of keys) {
    if (key === "\r" || key === "\n") {
      return { line: typed, end: "enter" };
    }
    if (key === "\u0003") {
      return { line: typed, end: "abort" };
    }
    if (key === "\u007f" || key === "\b") {
      typed = typed.slice(0, -1);
    } else if (key >= " ") {
      typed += key;
    }
  }
  return { line: typed };
}

function print(line: string): void {
  process.stdout.write(`${line}\n`);
}

function refuse(reason: string): number {
  process.stderr.write(`${reason}\n`);
  return 1;
}

// One line from the terminal, read in raw mode so the keys show only when `echo` is on. Null when
// Ctrl-C aborts it.
function ask(question: string, echo: boolean): Promise<string | null> {
  const { stdin, stdout } = process;
  stdin.setRawMode(true);
  stdout.write(question);
  return new Promise((resolve) => {
    let line = "";
    const onKeys = (keys: string): void => {
      const typed = typeKeys(line, keys);
      line = typed.line;
      if (echo) {
        stdout.write(`\r${question}${line}\u001b[K`);
      }
      if (typed.end) {
        stdin.off("data", onKeys);
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write("\n");
        resolve(typed.end === "enter" ? line : null);
      }
    };
    stdin.setEncoding("utf8");
    stdin.on("data", onKeys);
    stdin.resume();
  });
}

// Rows in drizzle's migrations table, or null before a first migration creates it.
async function appliedRows(db: NeonDatabase): Promise<number | null> {
  const {
    rows: [table],
  } = await db.execute<{ present: boolean }>(
    sql`select to_regclass('drizzle.__drizzle_migrations') is not null as present`,
  );
  if (!table?.present) {
    return null;
  }
  const {
    rows: [count],
  } = await db.execute<{ applied: number }>(
    sql`select count(*)::int as applied from drizzle.__drizzle_migrations`,
  );
  return count?.applied ?? 0;
}

async function migrateTarget(db: NeonDatabase, host: string): Promise<number> {
  const {
    rows: [database],
  } = await db.execute<{ name: string; note: string | null }>(sql`
    select datname as name, shobj_description(oid, 'pg_database') as note
    from pg_database where datname = current_database()`);
  if (isTestDatabase(database?.note ?? null)) {
    return refuse(
      `That's the ${TEST_DATABASE_NOTE} project's database. Nothing changed.`,
    );
  }

  const tags = journal.entries.map((entry) => entry.tag);
  const { applied, pending } = pendingSummary(tags, await appliedRows(db));
  print(`Target: ${host}, database ${database?.name}`);
  print(`Migrations in the journal: ${tags.join(", ")}`);
  print(`Applied on the target: ${applied}`);
  if (pending.length === 0) {
    print("Nothing to apply.");
    return 0;
  }
  print(`To apply: ${pending.join(", ")}`);
  const answer = await ask(
    'Type "migrate" to apply them, anything else to stop: ',
    true,
  );
  if (!confirmed(answer)) {
    return refuse("Stopped. Nothing changed.");
  }

  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const after = pendingSummary(tags, await appliedRows(db));
  const { rows: tables } = await db.execute<{ name: string }>(
    sql`select tablename as name from pg_tables where schemaname = 'public' order by tablename`,
  );
  print(`Applied on the target: ${after.applied} of ${tags.length}`);
  print(
    `Tables in public: ${tables.map((table) => table.name).join(", ") || "none"}`,
  );
  return 0;
}

async function main(): Promise<number> {
  if (!(process.stdin.isTTY && process.stdout.isTTY)) {
    return refuse("Run this in your own terminal.");
  }
  const url = (
    await ask("Production database URL (hidden as you type): ", false)
  )?.trim();
  if (url === undefined) {
    return refuse("Stopped. Nothing changed.");
  }
  const refusal = urlRefusal(url, process.env.DATABASE_URL);
  if (refusal) {
    return refuse(refusal);
  }

  const pool = new Pool({ connectionString: url });
  // An idle connection that drops is the pool's to replace, and the next query reports any
  // failure that matters. Unheard, this event would crash with the error's message.
  pool.on("error", () => undefined);
  try {
    return await migrateTarget(
      drizzle({ client: pool }),
      URL.parse(url)?.hostname ?? "",
    );
  } finally {
    await pool.end();
  }
}

if (import.meta.main) {
  const code = await main().catch((err: unknown) => {
    // KTD20: an error's message can quote the host or a value, so only its class and code.
    const { errorClass, errorCode } = loggable(err);
    return refuse(`Failed: ${errorClass}${errorCode ? ` ${errorCode}` : ""}.`);
  });
  process.exit(code);
}
