import { beforeEach, describe, expect, it } from "bun:test";
import { ANOTHER_OWNER, OWNER } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

// 0015 (U20): each week's milestone moves from its review to the week's plan. The test database
// ran it while empty, so the test runs its SQL again over reviews as the code before it wrote them.
const MIGRATION = await Bun.file(
  `${import.meta.dir}/../../db/migrations/0015_week_milestones.sql`,
).text();

const aReview = (ownerId: string, week: string, milestone: string | null) =>
  sql(
    "insert into weekly_reviews (owner_id, week, counts, targets, milestone, change, author, created_at, updated_at) values ($1, $2, '{}', '{}', $3, 'A fictional change', 'owner', '2026-10-30T20:00:00.123456Z', '2026-10-31T10:00:00.654321Z')",
    [ownerId, week, milestone],
  );

describe("0015, a review's milestone as its week's plan [postgres]", () => {
  beforeEach(resetDatabase);

  it("copies each week's milestone to its plan with the review's times, and leaves a blank one behind", async () => {
    await aReview(OWNER, "2026-10-26", "Ship the fictional widget");
    await aReview(OWNER, "2026-10-19", "   ");
    await aReview(OWNER, "2026-10-12", null);
    await aReview(ANOTHER_OWNER, "2026-10-26", "Theirs");

    await sql(MIGRATION);

    const plans = await sql<{
      owner_id: string;
      week: string;
      milestone: string;
      created: string;
      updated: string;
    }>(
      "select owner_id, to_char(week, 'YYYY-MM-DD') as week, milestone, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') as created, to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') as updated from week_plans order by milestone",
    );
    expect(plans).toEqual([
      {
        owner_id: OWNER,
        week: "2026-10-26",
        milestone: "Ship the fictional widget",
        created: "2026-10-30 20:00:00.123456",
        // An edit sends back a JS Date, to the millisecond.
        updated: "2026-10-31 10:00:00.654000",
      },
      {
        owner_id: ANOTHER_OWNER,
        week: "2026-10-26",
        milestone: "Theirs",
        created: "2026-10-30 20:00:00.123456",
        updated: "2026-10-31 10:00:00.654000",
      },
    ]);
  });
});
