import { beforeEach, describe, expect, it } from "bun:test";
import { sql as drizzleSql } from "drizzle-orm";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import { unwrapDrizzleTx } from "@/src/infrastructure/services/transaction-manager.service";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  postgresRepositories,
} from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

const JOB: RecordRef = {
  kind: "job",
  id: "00000000-0000-4000-8000-0000000000b1",
};
const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };
const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "update_job",
};

describeEachBackend("recordChange", () => {
  const history = async (app: ReturnType<typeof makeApp>) =>
    (await app.listActivity(OWNER, { limit: 20, offset: 0 })).entries;

  it("keeps only the fields whose values changed, each before and after", async () => {
    const app = makeApp();
    await app.repos.transactions.startTransaction((tx) =>
      recordChange(app.repos.activity, tx, CLAUDE, {
        record: JOB,
        action: "updated",
        before: {
          status: "applied",
          nextStep: "Follow up",
          nextDate: "2026-10-30",
          tags: ["remote"],
        },
        after: {
          status: "screen",
          nextStep: "Follow up",
          nextDate: null,
          tags: ["remote"],
        },
      }),
    );

    expect(await history(app)).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "update_job",
        record: JOB,
        action: "updated",
        changes: [
          { field: "status", before: "applied", after: "screen" },
          { field: "nextDate", before: "2026-10-30", after: null },
        ],
        reason: null,
      }),
    ]);
  });

  it("records a new record's fields as set from nothing, leaving out the empty ones", async () => {
    const app = makeApp();
    await app.repos.transactions.startTransaction((tx) =>
      recordChange(app.repos.activity, tx, HECTOR, {
        record: JOB,
        action: "created",
        after: { role: "Widget designer", website: null, tier: 2 },
      }),
    );

    expect(await history(app)).toEqual([
      expect.objectContaining({
        actor: "owner",
        tool: null,
        action: "created",
        changes: [
          { field: "role", before: null, after: "Widget designer" },
          { field: "tier", before: null, after: 2 },
        ],
      }),
    ]);
  });
});

// The activity row rides the write's own transaction (docs/build-plan.md KTD7).
describe("recordChange in a write's transaction [postgres]", () => {
  beforeEach(async () => {
    await resetDatabase();
    // A table of the test's own, standing in for the record tables later units add.
    await sql(
      "create table if not exists test_records (id uuid primary key, name text not null)",
    );
    await sql("truncate test_records");
  });

  // Writes a record and its activity row in one transaction, and fails after both when asked.
  const createRecord = ({ failAfter }: { failAfter: boolean }) => {
    const { activity, transactions } = postgresRepositories();
    return transactions.startTransaction(async (tx) => {
      await unwrapDrizzleTx(tx).execute(
        drizzleSql`insert into test_records (id, name) values (${JOB.id}, 'Fictional Co')`,
      );
      await recordChange(activity, tx, HECTOR, {
        record: JOB,
        action: "created",
        after: { name: "Fictional Co" },
      });
      if (failAfter) {
        throw new Error("A later step failed");
      }
    });
  };

  it("commits a change and its activity row together", async () => {
    await createRecord({ failAfter: false });

    expect(await sql("select name from test_records")).toEqual([
      { name: "Fictional Co" },
    ]);
    expect(await sql("select actor, action from activity")).toEqual([
      { actor: "owner", action: "created" },
    ]);
  });

  it("rolls both back when a step after the activity row fails", async () => {
    await expect(createRecord({ failAfter: true })).rejects.toBeInstanceOf(
      DatabaseOperationError,
    );

    expect(await sql("select id from test_records")).toEqual([]);
    expect(await sql("select id from activity")).toEqual([]);
  });
});
