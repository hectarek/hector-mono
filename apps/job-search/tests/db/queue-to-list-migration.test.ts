import { beforeEach, describe, expect, it } from "bun:test";
import { OWNER } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

// 0011 (U19): the review queue retires. The test database ran it while empty, so the test runs
// its SQL again over jobs as the queue left them.
const STATEMENTS = (
  await Bun.file(
    `${import.meta.dir}/../../db/migrations/0011_queue_to_list.sql`,
  ).text()
).split("--> statement-breakpoint");

const migrate = async () => {
  for (const statement of STATEMENTS) {
    await sql(statement);
  }
};

const aJob = async (
  role: string,
  reviewState: "pending" | "accepted" | "dismissed",
  extra: {
    postingKey?: string;
    nextStep?: string;
    dismissReason?: string;
  } = {},
) => {
  const [company] = await sql<{ id: string }>(
    "insert into companies (owner_id, name, name_key) values ($1, $2, $2) returning id",
    [OWNER, `${role} Co`],
  );
  const [source] = await sql<{ id: string }>(
    "insert into lead_sources (owner_id, name, name_key) values ($1, $2, $2) returning id",
    [OWNER, `${role} board`],
  );
  const [job] = await sql<{ id: string }>(
    `insert into jobs (owner_id, company_id, role, status, next_step, next_date, posting_key,
       found_on, lead_source_id, review_state, dismiss_reason)
     values ($1, $2, $3, 'verify', $4, $5, $6, '2026-01-05', $7, $8, $9) returning id`,
    [
      OWNER,
      company?.id,
      role,
      extra.nextStep ?? null,
      extra.nextStep ? "2026-01-06" : null,
      extra.postingKey ?? null,
      source?.id,
      reviewState,
      extra.dismissReason ?? null,
    ],
  );
  if (!job) throw new Error("No job");
  return job.id;
};

const jobRow = async (id: string) =>
  (
    await sql<{
      status: string;
      review_state: string;
      next_step: string | null;
      posting_key: string | null;
    }>(
      "select status, review_state, next_step, posting_key from jobs where id = $1",
      [id],
    )
  )[0];

const history = (id: string) =>
  sql<{ actor: string; changes: unknown; reason: string | null }>(
    "select actor, changes, reason from activity where record_id = $1 order by id",
    [id],
  );

describe("0011, the review queue's jobs join the ranked list [postgres]", () => {
  beforeEach(resetDatabase);

  it("accepts a pending proposal, logged by the system", async () => {
    const id = await aJob("Pending Engineer", "pending", {
      nextStep: "Check it's hiring",
    });

    await migrate();

    expect(await jobRow(id)).toEqual({
      status: "verify",
      review_state: "accepted",
      next_step: "Check it's hiring",
      posting_key: null,
    });
    expect(await history(id)).toEqual([
      {
        actor: "system",
        changes: [
          { field: "reviewState", before: "pending", after: "accepted" },
        ],
        reason: "The review queue retired, so the job joined the ranked list",
      },
    ]);
  });

  it("archives a dismissed proposal as skipped, keeping its posting, with a dated move and its reason", async () => {
    const id = await aJob("Dismissed Engineer", "dismissed", {
      postingKey: "boards.example.com/jobs/1",
      nextStep: "Check it's hiring",
      dismissReason: "wrong-level",
    });

    await migrate();

    expect(await jobRow(id)).toEqual({
      status: "skipped",
      review_state: "accepted",
      next_step: null,
      posting_key: "boards.example.com/jobs/1",
    });
    const moves = await sql<{ from_status: string; to_status: string }>(
      "select from_status, to_status from job_status_changes where job_id = $1",
      [id],
    );
    expect(moves).toEqual([{ from_status: "verify", to_status: "skipped" }]);
    expect(await history(id)).toEqual([
      {
        actor: "system",
        changes: [
          { field: "status", before: "verify", after: "skipped" },
          { field: "nextStep", before: "Check it's hiring", after: null },
          { field: "nextDate", before: "2026-01-06", after: null },
        ],
        reason: "Dismissed in the review queue (wrong-level)",
      },
    ]);
  });

  it("leaves accepted jobs alone, and a second run changes nothing", async () => {
    const accepted = await aJob("Accepted Engineer", "accepted");
    const pending = await aJob("Pending Engineer", "pending");

    await migrate();
    await migrate();

    expect((await jobRow(accepted))?.status).toBe("verify");
    expect(await history(accepted)).toEqual([]);
    expect(await history(pending)).toHaveLength(1);
  });
});
