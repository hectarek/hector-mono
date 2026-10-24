import { beforeEach, expect, it } from "bun:test";
import type {
  ActivityFilter,
  NewActivityEntry,
} from "@/src/entities/models/activity.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

const JOB = "00000000-0000-4000-8000-0000000000b1";
const ANOTHER_JOB = "00000000-0000-4000-8000-0000000000b2";

// A change as recordChange hands it over: the owner's move of a job unless a test says
// otherwise. `reason` doubles as a tag for telling entries apart.
const change = (entry: Partial<NewActivityEntry> = {}): NewActivityEntry => ({
  ownerId: OWNER,
  actor: "owner",
  tool: null,
  record: { kind: "job", id: JOB },
  action: "updated",
  changes: [{ field: "status", before: "applied", after: "screen" }],
  reason: null,
  ...entry,
});

// Everything, a page at a time: what list_activity starts from.
const filter = (narrower: Partial<ActivityFilter> = {}): ActivityFilter => ({
  limit: 20,
  offset: 0,
  ...narrower,
});

const reasons = (page: { entries: { reason: string | null }[] }) =>
  page.entries.map((entry) => entry.reason);

// Lets the clock move on, so one change is clearly before a moment and the next after it.
const tick = () => Bun.sleep(20);

describeEachBackend("the activity log", () => {
  let app: TestApp;
  // Appends a change in a transaction of its own, as each write does.
  const record = (entry: NewActivityEntry) =>
    app.repos.transactions.startTransaction((tx) =>
      app.repos.activity.add(entry, tx),
    );

  beforeEach(() => {
    app = makeApp();
  });

  it("keeps each change as it was made: when, who, the tool, the record, and each field before and after", async () => {
    await record(change({ actor: "agent", tool: "set_job_status" }));

    const [entry] = (await app.listActivity(OWNER, filter())).entries;
    expect(entry).toEqual({
      id: expect.any(Number),
      createdAt: expect.any(Date),
      actor: "agent",
      tool: "set_job_status",
      record: { kind: "job", id: JOB },
      action: "updated",
      changes: [{ field: "status", before: "applied", after: "screen" }],
      reason: null,
    });
  });

  it("keeps another owner's changes out", async () => {
    await record(change({ reason: "mine" }));
    await record(change({ ownerId: ANOTHER_OWNER, reason: "theirs" }));

    expect(reasons(await app.listActivity(OWNER, filter()))).toEqual(["mine"]);
  });

  it("lists one record's changes, for its history", async () => {
    await record(change({ reason: "this job" }));
    await record(
      change({ record: { kind: "job", id: ANOTHER_JOB }, reason: "another" }),
    );
    await record(
      change({ record: { kind: "company", id: JOB }, reason: "a company" }),
    );

    const history = await app.listActivity(
      OWNER,
      filter({ record: { kind: "job", id: JOB } }),
    );
    expect(reasons(history)).toEqual(["this job"]);
  });

  it("filtered by time and who made the change, returns them newest first, a page at a time", async () => {
    await record(change({ actor: "agent", reason: "before the window" }));
    await tick();
    const since = new Date();
    await tick();
    await record(change({ actor: "agent", reason: "first" }));
    await record(change({ actor: "owner", reason: "Hector's" }));
    await record(change({ actor: "agent", reason: "second" }));
    await record(change({ actor: "agent", reason: "third" }));
    await tick();
    const until = new Date();
    await tick();
    await record(change({ actor: "agent", reason: "after the window" }));

    const window = { actor: "agent" as const, since, until, limit: 2 };
    const first = await app.listActivity(OWNER, filter(window));
    expect(reasons(first)).toEqual(["third", "second"]);
    expect(first.nextOffset).toBe(2);

    const second = await app.listActivity(
      OWNER,
      filter({ ...window, offset: 2 }),
    );
    expect(reasons(second)).toEqual(["first"]);
    expect(second.nextOffset).toBeNull();
  });
});
