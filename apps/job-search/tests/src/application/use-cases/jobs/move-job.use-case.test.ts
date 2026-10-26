import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
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

  // AE3.
  it("to applied dated yesterday: applied-on is yesterday, and Follow up is due 7 days after it", async () => {
    await move("target");
    const applied = await move("applied", YESTERDAY);

    expect(applied).toMatchObject({
      status: "applied",
      appliedOn: YESTERDAY,
      nextStep: "Follow up",
      nextDate: "2026-11-01",
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
        { field: "nextStep", before: null, after: "Follow up" },
        { field: "nextDate", before: null, after: "2026-11-01" },
      ],
    });
  });

  it("to applied keeps an applied-on already set", async () => {
    await move("screen", "2026-10-20");
    const applied = await move("applied");

    expect(applied).toMatchObject({
      appliedOn: "2026-10-20",
      nextDate: "2026-10-27",
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

  it("from stale to screen: allowed, and logged", async () => {
    await move("applied", "2026-10-01");
    await move("stale", TODAY, "No reply in 21 days");
    const reopened = await move("screen");

    expect(reopened.status).toBe("screen");
    const [latest] = await app.repos.jobs.listStatusChanges(OWNER, job.id);
    expect(latest).toMatchObject({ from: "stale", to: "screen" });
  });

  it("refuses a date after today", async () => {
    await expect(move("target", "2026-10-27")).rejects.toBeInstanceOf(
      InputParseError,
    );
  });

  it("refuses to move a proposal Hector hasn't accepted", async () => {
    const jobs = jobFixtures(app);
    const proposal = await jobs.propose(job.company.id);

    await expect(
      app.moveJob(CLAUDE, { id: proposal.id, status: "applied" }),
    ).rejects.toThrow("A proposal's status moves once Hector accepts it.");
    expect(await app.repos.jobs.listStatusChanges(OWNER, proposal.id)).toEqual(
      [],
    );
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
