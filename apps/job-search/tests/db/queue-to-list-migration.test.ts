import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { OWNER } from "@/tests/_support/app";

// 0011 (U19): the review queue retires. 0012 later dropped the columns it reads, so the test runs
// on a database of its own, migrated through 0011 only, then runs 0011's SQL again over jobs as
// the queue left them.
const MIGRATIONS = `${import.meta.dir}/../../db/migrations`;
const STATEMENTS = (
  await Bun.file(`${MIGRATIONS}/0011_queue_to_list.sql`).text()
).split("--> statement-breakpoint");

// The migrations folder cut off after 0011, journal and all.
function throughQueueToList(): string {
  const folder = mkdtempSync(join(tmpdir(), "migrations-through-0011-"));
  mkdirSync(join(folder, "meta"));
  const journal = JSON.parse(
    readFileSync(`${MIGRATIONS}/meta/_journal.json`, "utf8"),
  ) as { entries: { idx: number; tag: string }[] };
  const kept = journal.entries.filter(({ idx }) => idx <= 11);
  for (const { tag } of kept) {
    cpSync(`${MIGRATIONS}/${tag}.sql`, join(folder, `${tag}.sql`));
  }
  writeFileSync(
    join(folder, "meta/_journal.json"),
    JSON.stringify({ ...journal, entries: kept }),
  );
  return folder;
}

const client = new PGlite();
await migrate(drizzle({ client }), { migrationsFolder: throughQueueToList() });

afterAll(async () => {
  await client.close();
});

const sql = async <T>(query: string, params: unknown[] = []): Promise<T[]> =>
  (await client.query<T>(query, params)).rows;

const resetDatabase = () =>
  client.exec(
    "truncate activity, companies, lead_sources, jobs, job_status_changes restart identity cascade;",
  );

const migrate0011 = async () => {
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

    await migrate0011();

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

    await migrate0011();

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

    await migrate0011();
    await migrate0011();

    expect((await jobRow(accepted))?.status).toBe("verify");
    expect(await history(accepted)).toEqual([]);
    expect(await history(pending)).toHaveLength(1);
  });
});
