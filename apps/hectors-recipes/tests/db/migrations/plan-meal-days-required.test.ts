import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { PGlite, type PGliteInterface } from "@electric-sql/pglite";

// Migration 0010 finishes 0009 once Phase 13 is live (docs/ux-plan.md P13.6): a meal the
// code before it added in between gets its eat day and cooked check, then eat days are
// required and "eaten" goes. Tested from the schema before it.
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
  "0009_plan_meal_days",
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
  const run = await statements("0010_plan_meal_days_required");
  await db.transaction(async (tx) => {
    for (const statement of run) {
      await tx.exec(statement);
    }
  });
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

describe("0010 plan meal days required", () => {
  test("fills a meal the old code added, keeps the rest, and drops eaten", async () => {
    // The old code: one day, "eaten", no eat days.
    await db.query(
      `insert into plan_entries (space_id, date, title, eaten, created_by)
       values ($1, '2026-09-24', 'Old way', true, $2)`,
      [PLAN, OWNER],
    );
    // Phase 13: cooked Sunday, eaten Monday and Tuesday.
    await db.query(
      `insert into plan_entries (space_id, date, eat_dates, title, created_by)
       values ($1, '2026-09-27', '{2026-09-28,2026-09-29}', 'New way', $2)`,
      [PLAN, OWNER],
    );
    await migrate();

    expect(
      (
        await db.query(
          `select title, eat_dates::text, cooked from plan_entries order by title`,
        )
      ).rows,
    ).toEqual([
      { title: "New way", eat_dates: "{2026-09-28,2026-09-29}", cooked: false },
      { title: "Old way", eat_dates: "{2026-09-24}", cooked: true },
    ]);
    expect(
      (
        await db.query(
          `select 1 from information_schema.columns where table_name = 'plan_entries' and column_name = 'eaten'`,
        )
      ).rows,
    ).toEqual([]);
  });

  test("then a meal needs a day to eat it", async () => {
    await migrate();
    await expect(
      db.query(
        `insert into plan_entries (space_id, date, title, created_by)
         values ($1, '2026-09-24', 'No days', $2)`,
        [PLAN, OWNER],
      ),
    ).rejects.toThrow();
  });
});
