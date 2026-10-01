import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { PGlite, type PGliteInterface } from "@electric-sql/pglite";

// Migration 0004 renames real books and plans, so it's tested from the schema before it.
const MIGRATIONS = `${import.meta.dir}/../../../db/migrations`;
const BEFORE = [
  "0000_drop_legacy_tables",
  "0001_spaces_schema",
  "0002_plan_entries_added_to_list",
  "0003_grocery_list_in_plan",
];

const HECTOR = "00000000-0000-4000-8000-000000000001";
const NAMELESS = "00000000-0000-4000-8000-000000000002";
const BLANK = "00000000-0000-4000-8000-000000000003";

async function statements(name: string): Promise<string[]> {
  const sql = await Bun.file(`${MIGRATIONS}/${name}.sql`).text();
  return sql.split("--> statement-breakpoint");
}

// The schema before it is built once and cloned per test: replaying the migrations for every
// test took over bun's 5 s limit on CI.
let before: PGlite;
let db: PGliteInterface;

async function space(type: string, name: string, owner: string) {
  const { rows } = await db.query<{ id: string }>(
    `insert into spaces (type, name) values ($1, $2) returning id`,
    [type, name],
  );
  await db.query(
    `insert into space_members (space_id, user_id, role) values ($1, $2, 'owner')`,
    [rows[0]?.id, owner],
  );
}

async function names(): Promise<string[]> {
  const { rows } = await db.query<{ name: string }>(
    `select name from spaces order by name`,
  );
  return rows.map((row) => row.name);
}

beforeAll(async () => {
  before = new PGlite();
  // Neon Auth owns this table in production.
  await before.exec(`
    create schema neon_auth;
    create table neon_auth."user" (id uuid primary key, name text, email text, image text);
  `);
  for (const name of BEFORE) {
    for (const statement of await statements(name)) {
      await before.exec(statement);
    }
  }
});

beforeEach(async () => {
  db = await before.clone();
  await db.query(
    `insert into neon_auth."user" (id, name) values ($1, ' Hector  Gonzalez'), ($2, null), ($3, '  ')`,
    [HECTOR, NAMELESS, BLANK],
  );
});

describe("0004 personal space names", () => {
  test("renames generic books and plans after their owner's first name", async () => {
    await space("meal-plan", "My Plan", HECTOR);
    await space("recipe-book", "My Recipes", HECTOR);

    for (const statement of await statements("0004_personal_space_names")) {
      await db.exec(statement);
    }

    expect(await names()).toEqual(["Hector's Plan", "Hector's Recipes"]);
  });

  test("leaves names someone chose, and accounts with no name, alone", async () => {
    await space("recipe-book", "Weeknights", HECTOR);
    await space("recipe-book", "My Plan", HECTOR);
    await space("meal-plan", "My Recipes", HECTOR);
    await space("meal-plan", "My Plan", NAMELESS);
    await space("recipe-book", "My Recipes", BLANK);

    for (const statement of await statements("0004_personal_space_names")) {
      await db.exec(statement);
    }

    expect(await names()).toEqual([
      "My Plan",
      "My Plan",
      "My Recipes",
      "My Recipes",
      "Weeknights",
    ]);
  });
});
