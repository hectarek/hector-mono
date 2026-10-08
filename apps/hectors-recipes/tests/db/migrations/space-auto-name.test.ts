import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { PGlite, type PGliteInterface } from "@electric-sql/pglite";

// Migration 0019 marks real books and plans as following their owner's name (D83), so it's
// tested from the schema before it.
const MIGRATIONS = `${import.meta.dir}/../../../db/migrations`;
const MIGRATION = "0019_space_auto_name";
const BEFORE = readdirSync(MIGRATIONS)
  .filter((file) => file.endsWith(".sql") && file < `${MIGRATION}.sql`)
  .sort()
  .map((file) => file.replace(/\.sql$/, ""));

const HECTOR = "00000000-0000-4000-8000-000000000001";
const NAMELESS = "00000000-0000-4000-8000-000000000002";
const RENAMED = "00000000-0000-4000-8000-000000000003";

async function statements(name: string): Promise<string[]> {
  const sql = await Bun.file(`${MIGRATIONS}/${name}.sql`).text();
  return sql.split("--> statement-breakpoint");
}

// The schema before it is built once and cloned per test, as the other migration tests do.
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

async function following(): Promise<string[]> {
  const { rows } = await db.query<{ name: string }>(
    `select name from spaces where auto_name order by name`,
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
  // RENAMED changed his account's name after his book was named "Old's Recipes".
  await db.query(
    `insert into neon_auth."user" (id, name) values ($1, ' Hector  Gonzalez'), ($2, null), ($3, 'New Name')`,
    [HECTOR, NAMELESS, RENAMED],
  );
});

async function migrate(): Promise<void> {
  for (const statement of await statements(MIGRATION)) {
    await db.exec(statement);
  }
}

describe("0019 space auto name", () => {
  test("marks books and plans still named as sign-up named them", async () => {
    await space("recipe-book", "Hector's Recipes", HECTOR);
    await space("meal-plan", "Hector's Plan", HECTOR);
    await space("recipe-book", "My Recipes", NAMELESS);
    await space("meal-plan", "My Plan", NAMELESS);

    await migrate();

    expect(await following()).toEqual([
      "Hector's Plan",
      "Hector's Recipes",
      "My Plan",
      "My Recipes",
    ]);
  });

  test("leaves names someone chose, or that no longer match, alone", async () => {
    await space("recipe-book", "Weeknights", HECTOR);
    await space("recipe-book", "Hector's Plan", HECTOR);
    await space("recipe-book", "My Recipes", HECTOR);
    await space("recipe-book", "Old's Recipes", RENAMED);

    await migrate();

    expect(await following()).toEqual([]);
    const { rows } = await db.query<{ count: number }>(
      `select count(*)::int as count from spaces where not auto_name`,
    );
    expect(rows[0]?.count).toBe(4);
  });
});
