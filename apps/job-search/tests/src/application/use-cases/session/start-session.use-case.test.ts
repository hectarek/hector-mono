import { expect, it } from "bun:test";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import type {
  ActivityEntry,
  ChangeContext,
} from "@/src/entities/models/activity.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

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

describeEachBackend("startSession", () => {
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
});
