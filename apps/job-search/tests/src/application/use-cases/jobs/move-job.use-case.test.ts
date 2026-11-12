import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import {
  ConflictError,
  HumanOnlyError,
  InputParseError,
} from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { Job } from "@/src/entities/models/job.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "set_job_status",
};

// Noon on 2026-10-26 in New York.
const TODAY = "2026-10-26";
const YESTERDAY = "2026-10-25";

describeEachBackend("moveJob", () => {
  let app: TestApp;
  let job: Job;

  beforeEach(async () => {
    setSystemTime(new Date("2026-10-26T16:00:00Z"));
    app = makeApp();
    const jobs = jobFixtures(app);
    job = await jobs.add(await jobs.company());
  });

  afterEach(() => {
    setSystemTime();
  });

  const move = (status: Job["status"], on?: string, reason?: string) =>
    app.moveJob(CLAUDE, { id: job.id, status, on, reason });

  // AE3, as revised 2026-11-09: the app sets no follow-up Hector hasn't agreed to.
  it("to applied dated yesterday: applied-on is yesterday, and no next step is set", async () => {
    await move("target");
    const applied = await move("applied", YESTERDAY);

    expect(applied).toMatchObject({
      status: "applied",
      appliedOn: YESTERDAY,
      nextStep: null,
      nextDate: null,
    });
  });

  it("to applied with a step given, sets that step, due a week out when it has no date", async () => {
    const applied = await app.moveJob(CLAUDE, {
      id: job.id,
      status: "applied",
      nextStep: "Follow up with the recruiter",
    });

    expect(applied).toMatchObject({
      status: "applied",
      nextStep: "Follow up with the recruiter",
      nextDate: "2026-11-02",
    });
  });

  it("logs each move with its date and who made it, and the job's history before and after", async () => {
    await move("target");
    await move("applied", YESTERDAY);

    expect(await app.repos.jobs.listStatusChanges(OWNER, job.id)).toEqual([
      {
        id: expect.any(Number),
        from: "target",
        to: "applied",
        on: YESTERDAY,
        actor: "agent",
      },
      {
        id: expect.any(Number),
        from: "verify",
        to: "target",
        on: TODAY,
        actor: "agent",
      },
    ]);
    const [latest] = (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: job.id },
        limit: 1,
        offset: 0,
      })
    ).entries;
    expect(latest).toMatchObject({
      actor: "agent",
      tool: "set_job_status",
      action: "updated",
      changes: [
        { field: "status", before: "target", after: "applied" },
        { field: "appliedOn", before: null, after: YESTERDAY },
        // The move to target set that stage's step, Apply, two days out (UX9); applied sets none.
        { field: "nextStep", before: "Apply", after: null },
        { field: "nextDate", before: "2026-10-28", after: null },
      ],
    });
  });

  // Finding 21 of the UX plan: an old Follow up no longer stays due past applied.
  it("replaces the step the job had with the new stage's", async () => {
    await move("applied", YESTERDAY);
    const screen = await move("screen");

    expect(screen).toMatchObject({
      status: "screen",
      nextStep: "Prepare for the screen",
      nextDate: "2026-10-28",
    });
  });

  it("takes the step and date given in place of the stage's: a step alone keeps the stage's date, a null date is a week out, and no step clears the date", async () => {
    const given = await app.moveJob(CLAUDE, {
      id: job.id,
      status: "screen",
      nextStep: "Send the portfolio",
      nextDate: "2026-10-30",
    });
    expect(given).toMatchObject({
      nextStep: "Send the portfolio",
      nextDate: "2026-10-30",
    });

    const alone = await app.moveJob(CLAUDE, {
      id: job.id,
      status: "onsite",
      nextStep: "Book the travel",
    });
    expect(alone).toMatchObject({
      nextStep: "Book the travel",
      nextDate: "2026-10-29",
    });

    const undated = await app.moveJob(CLAUDE, {
      id: job.id,
      status: "offer",
      nextStep: "Read the offer",
      nextDate: null,
    });
    expect(undated).toMatchObject({
      nextStep: "Read the offer",
      nextDate: "2026-11-02",
    });

    const none = await app.moveJob(CLAUDE, {
      id: job.id,
      status: "screen",
      nextStep: null,
    });
    expect(none).toMatchObject({ nextStep: null, nextDate: null });
  });

  it("to applied keeps an applied-on already set", async () => {
    await move("screen", "2026-10-20");
    const applied = await move("applied");

    expect(applied).toMatchObject({
      appliedOn: "2026-10-20",
      nextStep: null,
      nextDate: null,
    });
  });

  it("to a closed status clears the next step and date, with the reason in the history", async () => {
    await move("applied");
    const closed = await move("rejected", TODAY, "A form rejection");

    expect(closed).toMatchObject({
      status: "rejected",
      nextStep: null,
      nextDate: null,
    });
    const [latest] = (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: job.id },
        limit: 1,
        offset: 0,
      })
    ).entries;
    expect(latest?.reason).toBe("A form rejection");
  });

  it("from stale to screen, by Hector: allowed, and logged", async () => {
    await move("applied", "2026-10-01");
    await move("stale", TODAY, "No reply in 21 days");
    const reopened = await app.moveJob(HECTOR, {
      id: job.id,
      status: "screen",
    });

    expect(reopened.status).toBe("screen");
    const [latest] = await app.repos.jobs.listStatusChanges(OWNER, job.id);
    expect(latest).toMatchObject({ from: "stale", to: "screen" });
  });

  // AE2 as revised 2026-11-10 (R21): a job Hector passed on stays passed on.
  it("refuses Claude's move of an archived job back to an open status as Hector's, logs the refusal, and changes nothing", async () => {
    const archived = await app.moveJob(HECTOR, {
      id: job.id,
      status: "skipped",
      reason: "Not a fit",
    });

    await expect(move("verify")).rejects.toBeInstanceOf(HumanOnlyError);

    expect(await app.getJob(OWNER, { id: job.id })).toMatchObject({
      job: { status: "skipped", updatedAt: archived.updatedAt },
    });
    expect(await app.repos.jobs.listStatusChanges(OWNER, job.id)).toHaveLength(
      1,
    );
    const [refused] = (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: job.id },
        limit: 20,
        offset: 0,
      })
    ).entries;
    expect(refused).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "reopen",
    });
  });

  it("lets Claude archive a job, or move one archived to another archived status", async () => {
    await move("skipped", TODAY, "Not a fit");

    expect((await move("closed", TODAY, "Posting closed")).status).toBe(
      "closed",
    );
  });

  // The daily run moves against the updatedAt it read (KTD24).
  it("given the updatedAt read, refuses a move once the job has changed since, and writes nothing", async () => {
    const read = job.updatedAt;
    await move("target");

    const refusal = await app
      .moveJob(CLAUDE, {
        id: job.id,
        status: "skipped",
        reason: "Not picked in time",
        updatedAt: read,
      })
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(ConflictError);
    expect((refusal as ConflictError).current).toMatchObject({
      status: "target",
    });
    expect(await app.repos.jobs.listStatusChanges(OWNER, job.id)).toHaveLength(
      1,
    );
  });

  it("refuses a date after today", async () => {
    await expect(move("target", "2026-10-27")).rejects.toBeInstanceOf(
      InputParseError,
    );
  });

  // A retried move counts once (KTD7: counts read the moves).
  it("to the status the job holds already: writes and logs nothing", async () => {
    const applied = await move("applied", YESTERDAY);

    expect(await move("applied")).toEqual(applied);
    expect(await app.repos.jobs.listStatusChanges(OWNER, job.id)).toHaveLength(
      1,
    );
    expect(
      (
        await app.listActivity(OWNER, {
          record: { kind: "job", id: job.id },
          limit: 20,
          offset: 0,
        })
      ).entries.map((entry) => entry.action),
    ).toEqual(["updated", "created"]);
  });
});

describe("moveJob's actor", () => {
  it("is Hector's when he moves a job, as Claude's is Claude's", async () => {
    const app = makeApp();
    const jobs = jobFixtures(app);
    const job = await jobs.add(await jobs.company());

    await app.moveJob(HECTOR, { id: job.id, status: "target" });
    expect(await app.repos.jobs.listStatusChanges(OWNER, job.id)).toEqual([
      expect.objectContaining({ actor: "owner" }),
    ]);
  });
});
