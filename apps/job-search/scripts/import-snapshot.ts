// Imports the sheet's snapshot once (docs/build-plan.md KTD14, U11). The snapshot is a JSON file in
// Hector's private docs, never in the repo.
//
//   cd apps/job-search
//   bun --no-env-file scripts/import-snapshot.ts <snapshot.json> --owner=<owner id>           # dry run
//   bun --no-env-file scripts/import-snapshot.ts <snapshot.json> --owner=<owner id> --commit  # writes
//   bun scripts/import-snapshot.ts <snapshot.json> --owner=<owner id> --test                  # test project
//
// Without --test, the database URL comes from a prompt that shows nothing as it's typed, and the
// run refuses to start if .env was loaded, so no test-project value leaks into it. A commit shows
// the dry run first and writes only once "import" is typed: Hector's step, from his terminal
// (KTD17). With --test, it dry-runs against .env's database, and only the test project's. Either
// way it stops before any write unless the owner id is a user in the target's Neon Auth.
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { ask, print, refuse, type Terminal } from "@/scripts/lib/terminal";
import { loggable } from "@/src/entities/errors/loggable";
import {
  IMPORT_KINDS,
  type ImportReport,
} from "@/src/entities/models/import-snapshot.model";

const TEST_DATABASE_NOTE = "job-search-test";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ImportArgs = {
  path: string;
  ownerId: string;
  commit: boolean;
  test: boolean;
};

// The command line's snapshot path and flags, or why it can't be read.
export function parseArgs(argv: readonly string[]): ImportArgs | string {
  const [path, ...flags] = argv;
  const ownerId = flags
    .find((flag) => flag.startsWith("--owner="))
    ?.slice("--owner=".length);
  if (!path || path.startsWith("--")) {
    return "Give the snapshot's path first.";
  }
  if (!ownerId || !UUID.test(ownerId)) {
    return "Give the owner's user id: --owner=<id>.";
  }
  const commit = flags.includes("--commit");
  const test = flags.includes("--test");
  if (commit && test) {
    return "--test only dry-runs: a commit runs from Hector's terminal, against the database he names.";
  }
  return { path, ownerId, commit, test };
}

// The target database, as the import checks it before reading or writing anything.
export type Target = {
  ownerExists(ownerId: string): Promise<boolean>;
  isTestDatabase(): Promise<boolean>;
};

// What a report says: counts by kind, then each problem and each job that needs a status date.
export function reportLines(report: ImportReport): string[] {
  const count = (refs: Record<string, string[]>) =>
    IMPORT_KINDS.map((kind) => `${refs[kind]?.length ?? 0} ${kind}`).join(", ");
  return [
    `${report.commit ? "Created" : "Would create"}: ${count(report.created)}`,
    `Already imported, skipped: ${count(report.skipped)}`,
    ...report.problems.map(
      ({ kind, ref, reason }) =>
        `Not imported, ${kind} ${ref ?? "?"}: ${reason}`,
    ),
    ...report.undated.map(
      (ref) => `Job ${ref} is past applied with no status date`,
    ),
  ];
}

// The import's steps, around the use case: the checks, the dry run, and a commit only once
// "import" is typed.
export async function importTo(
  target: Target,
  terminal: Terminal,
  run: (commit: boolean) => Promise<ImportReport>,
  { ownerId, commit, test }: Omit<ImportArgs, "path">,
): Promise<number> {
  if (test && !(await target.isTestDatabase())) {
    return terminal.refuse(
      `--test runs only against the ${TEST_DATABASE_NOTE} project's database. Nothing changed.`,
    );
  }
  if (!(await target.ownerExists(ownerId))) {
    return terminal.refuse(
      "That owner id isn't a user in the target's Neon Auth. Nothing changed.",
    );
  }
  const dryRun = await run(false);
  for (const line of reportLines(dryRun)) {
    terminal.print(line);
  }
  if (!commit) {
    return 0;
  }
  if (dryRun.undated.length > 0) {
    return terminal.refuse(
      "Confirm a status date for each job above in the snapshot first. Nothing changed.",
    );
  }
  const answer = await terminal.ask(
    'Type "import" to write it, anything else to stop: ',
  );
  if (answer !== "import") {
    return terminal.refuse("Stopped. Nothing changed.");
  }
  const done = await run(true);
  for (const line of reportLines(done)) {
    terminal.print(line);
  }
  return done.refused || done.problems.length > 0 ? 1 : 0;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args === "string") {
    return refuse(args);
  }
  let url: string | undefined;
  if (args.test) {
    url = process.env.DATABASE_URL;
    if (!url) {
      return refuse("--test reads DATABASE_URL from .env, which has none.");
    }
  } else {
    if (process.env.DATABASE_URL) {
      return refuse(
        "DATABASE_URL is set: run with bun --no-env-file, so .env's test values stay out.",
      );
    }
    if (!(process.stdin.isTTY && process.stdout.isTTY)) {
      return refuse("Run this in your own terminal.");
    }
    url = (await ask("Database URL (hidden as you type): ", false))?.trim();
    if (!url) {
      return refuse("Stopped. Nothing changed.");
    }
    // The repositories' database module reads this when it loads, below.
    process.env.DATABASE_URL = url;
  }

  const snapshot: unknown = JSON.parse(await readFile(args.path, "utf8"));
  const sql = neon(url);
  const target: Target = {
    ownerExists: async (ownerId) => {
      const [row] =
        await sql`select exists (select 1 from neon_auth."user" where id::text = ${ownerId}) as present`;
      return row?.present === true;
    },
    isTestDatabase: async () => {
      const [row] = await sql`
        select shobj_description(oid, 'pg_database') as note
        from pg_database where datname = current_database()`;
      return row?.note === TEST_DATABASE_NOTE;
    },
  };
  const { importSnapshotWithRepositories } = await import(
    "@/scripts/lib/import-wiring"
  );
  return importTo(
    target,
    { print, refuse, ask: (question) => ask(question, true) },
    (commit) =>
      importSnapshotWithRepositories(args.ownerId, snapshot, { commit }),
    args,
  );
}

if (import.meta.main) {
  const code = await main().catch((err: unknown) => {
    // KTD20: an error's message can quote the URL or a value, so only its class and code.
    const { errorClass, errorCode } = loggable(err);
    return refuse(`Failed: ${errorClass}${errorCode ? ` ${errorCode}` : ""}.`);
  });
  process.exit(code);
}
