import { beforeEach, describe, expect, it } from "bun:test";
import { makeApp, OWNER, postgresRepositories } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

describe("PlanEntriesRepository (Postgres)", () => {
  beforeEach(resetDatabase);

  // docs/ux-plan.md D38, migration 0010: the database holds the rule the schemas check.
  it("won't store a meal with no day to eat it", async () => {
    const app = makeApp(postgresRepositories());
    const planId = await app.newSpace("meal-plan");
    await expect(
      sql(
        `insert into plan_entries (space_id, date, eat_dates, title, created_by)
         values ($1, $2, '{}', 'Soup', $3)`,
        [planId, "2026-09-23", OWNER],
      ),
    ).rejects.toThrow(/plan_entries_eat_dates_check/);
  });
});
