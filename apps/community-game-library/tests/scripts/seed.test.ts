import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { parseArgs, seed } from "@/scripts/seed";
import { CAST } from "@/tests/_support/cast";
import { resetDatabase, sql } from "@/tests/_support/database";

// Two test accounts' ids, as Neon Auth would give them.
const YOURS = "5f2c7a3e-1b4d-4e6f-8a9b-0c1d2e3f4a5b";
const ALICES = "6a3d8b4f-2c5e-4f70-9bac-1d2e3f4a5b6c";

function scriptedTerminal() {
  const lines: string[] = [];
  const refusals: string[] = [];
  return {
    lines,
    refusals,
    print: (line: string) => {
      lines.push(line);
    },
    refuse: (reason: string) => {
      refusals.push(reason);
      return 1;
    },
  };
}

describe("parseArgs", () => {
  it("dry-runs with the cast's own ids unless told otherwise", () => {
    expect(parseArgs([])).toEqual({ commit: false, accounts: {} });
  });

  it("writes with --commit, and maps members to accounts by name, in any case", () => {
    expect(
      parseArgs([
        "--as",
        `You=${YOURS}`,
        "--commit",
        "--as",
        `alice=${ALICES}`,
      ]),
    ).toEqual({ commit: true, accounts: { you: YOURS, alice: ALICES } });
  });

  it.each([
    [["--force"], "Unknown option --force"],
    [["--as"], "a cast member's name"],
    // You's key is "you", not their name.
    [["--as", `robin=${YOURS}`], "a cast member's name"],
    [["--as", "you=robin"], "needs a user id"],
    [["--as", `you=${YOURS}=${ALICES}`], "needs a user id"],
    [["--as", `you=${YOURS}`, "--as", `you=${ALICES}`], "two accounts"],
    [["--as", `you=${YOURS}`, "--as", `alice=${YOURS}`], "share one account"],
    // Sam keeps the cast's own id.
    [["--as", `alice=${CAST.people.sam.id}`], "share one account"],
  ])("refuses %p", (argv, reason) => {
    expect(parseArgs(argv)).toContain(reason);
  });
});

describe("seed", () => {
  // The test project's database carries this comment, and production's none.
  async function commentDatabase(note: string | null): Promise<void> {
    const [database] = await sql<{ name: string }>(
      "select current_database() as name",
    );
    await sql(
      `comment on database "${database?.name}" is ${note === null ? "null" : `'${note}'`}`,
    );
  }

  const count = async (table: string, where = "true") =>
    (
      await sql<{ count: number }>(
        `select count(*)::int as count from ${table} where ${where}`,
      )
    )[0]?.count;

  beforeEach(resetDatabase);
  afterEach(() => commentDatabase(null));

  it.each([null, "hectors-recipes-test"])(
    "refuses a database whose comment is %p, and writes nothing",
    async (note) => {
      await commentDatabase(note);
      const terminal = scriptedTerminal();

      expect(await seed({ commit: true, accounts: {} }, terminal)).toBe(1);
      expect(terminal.refusals).toEqual([
        "DATABASE_URL isn't the community-game-library-test Neon project's database, so the seed stops. Nothing was written.",
      ]);
      expect(await count("user_profiles")).toBe(0);
      expect(await count("games")).toBe(0);
    },
  );

  it("lists what a dry run would write, and writes nothing", async () => {
    await commentDatabase("community-game-library-test");
    const terminal = scriptedTerminal();

    expect(
      await seed({ commit: false, accounts: { you: YOURS } }, terminal),
    ).toBe(0);
    expect(terminal.lines).toEqual([
      "A dry run, so nothing was written. With --commit, the seed writes:",
      `  Robin Vale: ${YOURS}`,
      `  Alice: ${CAST.people.alice.id} (the cast's own id, no account)`,
      `  Sam: ${CAST.people.sam.id} (the cast's own id, no account)`,
      `  Priya: ${CAST.people.priya.id} (the cast's own id, no account)`,
      `  Jo: ${CAST.people.jo.id} (the cast's own id, no account)`,
      `  Ben: ${CAST.people.ben.id} (the cast's own id, no account)`,
      `  Mei: ${CAST.people.mei.id} (the cast's own id, no account)`,
      `  Dev: ${CAST.people.dev.id} (the cast's own id, no account)`,
      `  Noor: ${CAST.people.noor.id} (the cast's own id, no account)`,
      "  Profiles: 9 to write, 0 already there",
      "  Settings: 9 to write, 0 already there",
      "  Friendships: 18 to write, 0 already there",
      "  Friend requests: 2 to write, 0 already there",
      "  Games: 13 to write, 0 already there",
      "  Copies: 11 to write, 0 already there",
      "  Expansions in boxes: 2 to write, 0 already there",
      "  Loans: 15 to write, 0 already there",
    ]);
    for (const table of [
      "user_profiles",
      "friendships",
      "friend_requests",
      "games",
      "loans",
    ]) {
      expect(await count(table)).toBe(0);
    }
  });

  it("writes the cast with --commit, each member as their account, and nothing twice", async () => {
    await commentDatabase("community-game-library-test");
    const args = { commit: true, accounts: { you: YOURS, alice: ALICES } };

    expect(await seed(args, scriptedTerminal())).toBe(0);
    expect(
      await sql("select name, phone from user_profiles where user_id = $1", [
        YOURS,
      ]),
    ).toEqual([{ name: "Robin Vale", phone: "555 0199" }]);
    expect(await count("user_profiles")).toBe(9);
    expect(await count("user_settings")).toBe(9);
    // Both rows of each.
    expect(await count("friendships")).toBe(36);
    expect(await count("friendships", `user_id = '${YOURS}'`)).toBe(5);
    // The circle's 15 friendships since July, as E3 dates them, and the friends of friends' 3
    // before.
    expect(
      await count("friendships", "created_at = '2026-07-11T23:00:00Z'"),
    ).toBe(30);
    expect(await count("friend_requests")).toBe(2);
    expect(await count("user_games", `user_id = '${YOURS}'`)).toBe(4);
    expect(await count("user_games", `user_id = '${ALICES}'`)).toBe(2);
    expect(await count("loans", `borrower_user_id = '${YOURS}'`)).toBe(6);
    expect(await count("user_game_expansions")).toBe(2);

    const again = scriptedTerminal();
    expect(await seed(args, again)).toBe(0);
    expect(again.lines.slice(-8)).toEqual([
      "  Profiles: 0 written, 9 already there",
      "  Settings: 0 written, 9 already there",
      "  Friendships: 0 written, 18 already there",
      "  Friend requests: 0 written, 2 already there",
      "  Games: 0 written, 13 already there",
      "  Copies: 0 written, 11 already there",
      "  Expansions in boxes: 0 written, 2 already there",
      "  Loans: 0 written, 15 already there",
    ]);
    expect(await count("friendships")).toBe(36);
  });
});
