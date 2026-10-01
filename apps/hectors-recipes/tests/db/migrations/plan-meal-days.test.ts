import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { PGlite, type PGliteInterface } from "@electric-sql/pglite";

// Migration 0009 gives meals eat days and a cooked check (docs/ux-plan.md D38, D39), filled
// from the day they were planned for and "eaten". Tested from the schema before it.
const MIGRATIONS = `${import.meta.dir}/../../../db/migrations`;
const BEFORE = [
  "0000_drop_legacy_tables",
  "0001_spaces_schema",
  "0002_plan_entries_added_to_list",
  "0003_grocery_list_in_plan",
  "0004_personal_space_names",
  "0005_user_settings",
  "0006_itemized_recipes",
  "0007_drop_recipe_instructions",
  "0008_recipe_step_sections",
];

const OWNER = "00000000-0000-4000-8000-000000000001";
const PLAN = "20000000-0000-4000-8000-000000000001";

async function statements(name: string): Promise<string[]> {
  const sql = await Bun.file(`${MIGRATIONS}/${name}.sql`).text();
  return sql.split("--> statement-breakpoint");
}

let before: PGlite;
let db: PGliteInterface;

async function migrate(): Promise<void> {
  const run = await statements("0009_plan_meal_days");
  await db.transaction(async (tx) => {
    for (const statement of run) {
      await tx.exec(statement);
    }
  });
}

// A meal as the code before Phase 13 writes it: one day, and "eaten".
async function meal(title: string, date: string, eaten: boolean) {
  await db.query(
    `insert into plan_entries (space_id, date, title, eaten, created_by)
     values ($1, $2, $3, $4, $5)`,
    [PLAN, date, title, eaten, OWNER],
  );
}

async function meals() {
  return (
    await db.query<{
      title: string;
      eat_dates: string;
      cooked: boolean;
    }>(`select title, eat_dates::text, cooked from plan_entries order by title`)
  ).rows;
}

beforeAll(async () => {
  before = new PGlite();
  // Neon Auth owns this table in production; 0004 reads it.
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
    `insert into spaces (id, type, name) values ($1, 'meal-plan', 'Home')`,
    [PLAN],
  );
});

describe("0009 plan meal days", () => {
  test("a meal is eaten on the day it was planned for, and cooked if it was eaten", async () => {
    await meal("Chili", "2026-09-21", true);
    await meal("Tacos", "2026-09-23", false);
    await migrate();

    expect(await meals()).toEqual([
      { title: "Chili", eat_dates: "{2026-09-21}", cooked: true },
      { title: "Tacos", eat_dates: "{2026-09-23}", cooked: false },
    ]);
  });

  test("the code before it can still add a meal, with no eat days yet", async () => {
    await migrate();
    await meal("Soup", "2026-09-24", false);

    expect(await meals()).toEqual([
      { title: "Soup", eat_dates: "{}", cooked: false },
    ]);
  });
});
