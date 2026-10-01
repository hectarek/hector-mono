import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { PGlite, type PGliteInterface } from "@electric-sql/pglite";

// Migration 0003 moves real data (each list's items onto its owner's plan), so it's tested
// from the schema before it, on a database of its own rather than the shared test one.
const MIGRATIONS = `${import.meta.dir}/../../../db/migrations`;
const BEFORE = [
  "0000_drop_legacy_tables",
  "0001_spaces_schema",
  "0002_plan_entries_added_to_list",
];

const OWNER = "00000000-0000-4000-8000-000000000001";
const PARTNER = "00000000-0000-4000-8000-000000000002";
const LIST = "10000000-0000-4000-8000-000000000001";
const PLAN = "20000000-0000-4000-8000-000000000001";
const NEWER_PLAN = "20000000-0000-4000-8000-000000000002";

async function statements(name: string): Promise<string[]> {
  const sql = await Bun.file(`${MIGRATIONS}/${name}.sql`).text();
  return sql.split("--> statement-breakpoint");
}

// The schema before it is built once and cloned per test: replaying the migrations for every
// test took over bun's 5 s limit on CI.
let before: PGlite;
let db: PGliteInterface;

async function migrate(): Promise<void> {
  const run = await statements("0003_grocery_list_in_plan");
  // The migrator runs each migration in a transaction; so does this.
  await db.transaction(async (tx) => {
    for (const statement of run) {
      await tx.exec(statement);
    }
  });
}

async function space(id: string, type: string, owner: string, created: string) {
  await db.query(
    `insert into spaces (id, type, name, created_at) values ($1, $2, 'x', $3)`,
    [id, type, created],
  );
  await db.query(
    `insert into space_members (space_id, user_id, role) values ($1, $2, 'owner')`,
    [id, owner],
  );
}

async function item(text: string) {
  await db.query(
    `insert into grocery_items (space_id, space_type, text, created_by)
     values ($1, 'grocery-list', $2, $3)`,
    [LIST, text, OWNER],
  );
}

beforeAll(async () => {
  before = new PGlite();
  for (const name of BEFORE) {
    for (const statement of await statements(name)) {
      await before.exec(statement);
    }
  }
});

beforeEach(async () => {
  db = await before.clone();
  await space(LIST, "grocery-list", OWNER, "2026-09-01");
  await item("2 onions");
  await item("milk");
});

describe("0003 grocery list in plan", () => {
  test("moves a list's items onto its owner's oldest plan and deletes the list", async () => {
    await space(NEWER_PLAN, "meal-plan", OWNER, "2026-09-10");
    await space(PLAN, "meal-plan", OWNER, "2026-09-02");
    await db.query(
      `insert into space_members (space_id, user_id, role) values ($1, $2, 'editor')`,
      [LIST, PARTNER],
    );
    await db.query(
      `insert into space_invites (space_id, token, created_by) values ($1, 'token', $2)`,
      [LIST, OWNER],
    );

    await migrate();

    const items = await db.query<{ space_id: string; space_type: string }>(
      `select space_id, space_type from grocery_items order by text`,
    );
    expect(items.rows).toEqual([
      { space_id: PLAN, space_type: "meal-plan" },
      { space_id: PLAN, space_type: "meal-plan" },
    ]);
    const left = await db.query<{ n: number }>(
      `select (select count(*) from spaces where id = $1)::int
            + (select count(*) from space_members where space_id = $1)::int
            + (select count(*) from space_invites where space_id = $1)::int as n`,
      [LIST],
    );
    expect(left.rows[0]?.n).toBe(0);
  });

  test("afterwards the database refuses a separate list", async () => {
    await space(PLAN, "meal-plan", OWNER, "2026-09-02");
    await migrate();

    await expect(
      db.query(`insert into spaces (type, name) values ('grocery-list', 'x')`),
    ).rejects.toThrow();
  });

  test("stops, changing nothing, when a list's owner has no plan", async () => {
    await space(PLAN, "meal-plan", PARTNER, "2026-09-02");

    await expect(migrate()).rejects.toThrow(
      "no meal plan to move its items to",
    );

    const items = await db.query<{ space_id: string }>(
      `select space_id from grocery_items`,
    );
    expect(items.rows).toEqual([{ space_id: LIST }, { space_id: LIST }]);
  });
});
