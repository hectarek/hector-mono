// Writes the design canvas's cast (tests/_support/cast.ts) to the database in .env's DATABASE_URL,
// which must be the Neon test project's (docs/build-plan.md KTD21): its people with their pieces,
// their friendships, the games, the copies and the loans, so a screen can be checked against its
// board with the same data (KTD13). Agents run it under KTD1's standing OK; it never reaches
// production, and it prints nothing from .env.
//
//   cd apps/community-game-library
//   bun scripts/seed.ts                                    # a dry run: what it would write
//   bun scripts/seed.ts --commit --as you=<user id> --as alice=<user id> …
//
// --as maps a cast member to a real test account (.cast-accounts.json holds them); the rest keep
// the cast's own ids, which no account has. It writes what's missing in one transaction and skips
// what's there, so it runs again safely, and a unit that adds to the cast runs it again.
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { print, refuse, type Terminal } from "@/scripts/lib/terminal";
import { loggable } from "@/src/entities/errors/loggable";
import { FriendRequestsRepository } from "@/src/infrastructure/repositories/friend-requests.repository";
import { FriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository";
import { UserProfilesRepository } from "@/src/infrastructure/repositories/user-profiles.repository";
import { UserSettingsRepository } from "@/src/infrastructure/repositories/user-settings.repository";
import { ConsoleLoggerService } from "@/src/infrastructure/services/console-logger.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import {
  CAST,
  CAST_NAMES,
  type CastName,
  castRows,
  insertCastRows,
  writeCastPeople,
} from "@/tests/_support/cast";

// The comment the test project's database carries (COMMENT ON DATABASE), as
// scripts/check-test-database.ts checks it. Production's has none.
const TEST_DATABASE_NOTE = "community-game-library-test";

type SeedArgs = {
  commit: boolean;
  accounts: Partial<Record<CastName, string>>;
};

const isCastName = (name: string): name is CastName =>
  (CAST_NAMES as readonly string[]).includes(name);

// The command line's flags, or why they can't be used.
export function parseArgs(argv: readonly string[]): SeedArgs | string {
  const args: SeedArgs = { commit: false, accounts: {} };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--commit") {
      args.commit = true;
      continue;
    }
    if (flag !== "--as") {
      return `Unknown option ${flag}: the seed takes --commit and --as <name>=<user id>.`;
    }
    index++;
    const [name, userId, ...rest] = (argv[index] ?? "").split("=");
    const member = name?.toLowerCase() ?? "";
    if (!isCastName(member)) {
      return `--as needs a cast member's name (${CAST_NAMES.join(", ")}) before its =.`;
    }
    const account = z.uuid().safeParse(userId);
    if (rest.length > 0 || !account.success) {
      return `--as ${member}= needs a user id.`;
    }
    if (args.accounts[member]) {
      return `--as gives ${member} two accounts.`;
    }
    args.accounts[member] = account.data;
  }
  const userIds = Object.values(castRows(args.accounts).userIds);
  if (new Set(userIds).size < userIds.length) {
    return "Two cast members can't share one account.";
  }
  return args;
}

async function isTestDatabase(): Promise<boolean> {
  const { rows } = await db.execute<{ note: string | null }>(sql`
    select shobj_description(oid, 'pg_database') as note
    from pg_database where datname = current_database()`);
  return rows[0]?.note === TEST_DATABASE_NOTE;
}

// The seed's steps: the check, then the counts, and the writes with --commit.
export async function seed(
  args: SeedArgs,
  terminal: Pick<Terminal, "print" | "refuse">,
): Promise<number> {
  if (!(await isTestDatabase())) {
    return terminal.refuse(
      `DATABASE_URL isn't the ${TEST_DATABASE_NOTE} Neon project's database, so the seed stops. Nothing was written.`,
    );
  }
  const rows = castRows(args.accounts);
  const log = new ConsoleLoggerService({ script: "seed" });
  const repositories = {
    userProfiles: new UserProfilesRepository(log),
    userSettings: new UserSettingsRepository(log),
    friendships: new FriendshipsRepository(log),
    friendRequests: new FriendRequestsRepository(log),
  };
  const options = { commit: args.commit };
  const tallies = await new TransactionManagerService(log).startTransaction(
    async (tx) => [
      ...(await writeCastPeople(rows, repositories, tx, options)),
      ...(await insertCastRows(rows, tx, options)),
    ],
  );

  terminal.print(
    args.commit
      ? "The cast, written to the test project:"
      : "A dry run, so nothing was written. With --commit, the seed writes:",
  );
  for (const name of CAST_NAMES) {
    terminal.print(
      `  ${CAST.people[name].name}: ${rows.userIds[name]}${args.accounts[name] ? "" : " (the cast's own id, no account)"}`,
    );
  }
  for (const { what, toWrite, there } of tallies) {
    terminal.print(
      `  ${what}: ${toWrite} ${args.commit ? "written" : "to write"}, ${there} already there`,
    );
  }
  return 0;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args === "string") {
    return refuse(args);
  }
  if (!process.env.DATABASE_URL) {
    return refuse("The seed writes to .env's DATABASE_URL, which isn't set.");
  }
  // The seed says what it did; its logs say only what went wrong, unless LOG_LEVEL asks for more.
  process.env.LOG_LEVEL ||= "warn";
  return seed(args, { print, refuse });
}

if (import.meta.main) {
  const code = await main().catch((err: unknown) => {
    // An error's message can quote the database's address or a value: only its class and code.
    const { errorClass, errorCode } = loggable(err);
    return refuse(
      `The seed failed: ${errorClass}${errorCode ? ` ${errorCode}` : ""}. Nothing was written.`,
    );
  });
  process.exit(code);
}
