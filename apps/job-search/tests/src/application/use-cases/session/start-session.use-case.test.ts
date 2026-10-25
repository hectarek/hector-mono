import { beforeEach, describe, expect, it } from "bun:test";
import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  ActivityEntry,
  ChangeContext,
} from "@/src/entities/models/activity.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  postgresRepositories,
  type TestApp,
} from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "start_session",
};
const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };
const JOB = {
  kind: "job" as const,
  id: "00000000-0000-4000-8000-0000000000b1",
};

// Lets the clock move on, so changes made one after another stay in that order in time.
const tick = () => Bun.sleep(20);

// What a change was, in a word: a job's new status, or a session's start.
const summary = (entry: ActivityEntry) =>
  entry.record.kind === "agent-session"
    ? `${entry.actor} started a session`
    : `${entry.actor} set ${entry.changes.map((change) => change.after).join()}`;

// Hector moves the job, in a transaction of its own as each write is.
const hectorSets = (app: TestApp, status: string) =>
  app.repos.transactions.startTransaction((tx) =>
    recordChange(app.repos.activity, tx, HECTOR, {
      record: JOB,
      action: "updated",
      before: { status: "target" },
      after: { status },
    }),
  );

// The app with the log's second read failing once, as a dropped connection would fail it: in a
// session start, the read of the changes, after the start row and its read-back.
const withSecondReadFailing = (app: TestApp): TestApp => {
  const { activity } = app.repos;
  let reads = 0;
  const failing: IActivityRepository = {
    add: (...args) => activity.add(...args),
    list: async (...args) => {
      reads += 1;
      if (reads === 2) {
        throw new DatabaseOperationError("list failed");
      }
      return activity.list(...args);
    },
  };
  return makeApp({ ...app.repos, activity: failing });
};

describeEachBackend("startSession", () => {
  it("logs the session's start as a record of its own, made by the session's actor through the tool", async () => {
    const app = makeApp();
    const started = await app.startSession(CLAUDE, { limit: 20 });

    const { entries } = await app.listActivity(OWNER, {
      limit: 20,
      offset: 0,
    });
    expect(entries).toEqual([
      {
        id: expect.any(Number),
        createdAt: started.session.startedAt,
        actor: "agent",
        tool: "start_session",
        record: { kind: "agent-session", id: started.session.id },
        action: "created",
        changes: [],
        reason: null,
      },
    ]);
  });

  it("answers with every change since the previous session started, newest first, that start last", async () => {
    const app = makeApp();
    await hectorSets(app, "verify");
    await tick();
    const previous = await app.startSession(CLAUDE, { limit: 20 });
    await tick();
    await hectorSets(app, "applied");
    await tick();
    await hectorSets(app, "screen");
    await tick();

    const started = await app.startSession(CLAUDE, { limit: 20 });
    expect(started.since).toEqual(previous.session.startedAt);
    expect(started.changes.map(summary)).toEqual([
      "owner set screen",
      "owner set applied",
      "agent started a session",
    ]);
    expect(started.changes.at(-1)?.record.id).toBe(previous.session.id);
    expect(started.nextOffset).toBeNull();
  });

  it("answers the first session with every change before it", async () => {
    const app = makeApp();
    await hectorSets(app, "verify");
    await tick();

    const started = await app.startSession(CLAUDE, { limit: 20 });
    expect(started.since).toBeNull();
    expect(started.changes.map(summary)).toEqual(["owner set verify"]);
  });

  it("answers a page of changes at a time, with where the next page starts", async () => {
    const app = makeApp();
    for (const status of ["verify", "applied", "screen"]) {
      await hectorSets(app, status);
      await tick();
    }

    const started = await app.startSession(CLAUDE, { limit: 2 });
    expect(started.changes.map(summary)).toEqual([
      "owner set screen",
      "owner set applied",
    ]);
    expect(started.nextOffset).toBe(2);
  });

  it("fails when a read after the start fails", async () => {
    const app = withSecondReadFailing(makeApp());

    await expect(
      app.startSession(CLAUDE, { limit: 20 }),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });
});

// What only the database shows: the failed start rolls back.
describe("startSession when a read after the start fails [postgres]", () => {
  beforeEach(resetDatabase);

  it("keeps no start row, so a retry still answers with every change since the last session that started", async () => {
    const app = makeApp(postgresRepositories());
    const previous = await app.startSession(CLAUDE, { limit: 20 });
    await tick();
    await hectorSets(app, "applied");
    await tick();

    await expect(
      withSecondReadFailing(app).startSession(CLAUDE, { limit: 20 }),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
    expect(
      await sql(
        "select record_id from activity where record_kind = 'agent-session'",
      ),
    ).toEqual([{ record_id: previous.session.id }]);

    const retried = await app.startSession(CLAUDE, { limit: 20 });
    expect(retried.since).toEqual(previous.session.startedAt);
    expect(retried.changes.map(summary)).toEqual([
      "owner set applied",
      "agent started a session",
    ]);
  });
});
