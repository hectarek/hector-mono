import { beforeEach, expect, it } from "bun:test";
import {
  DuplicateError,
  NotFoundError,
  QueueFullError,
} from "@/src/entities/errors/common";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures, newPosting } from "@/tests/_support/jobs";

describeEachBackend("createJob", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;
  let acme: string;

  beforeEach(async () => {
    app = makeApp();
    jobs = jobFixtures(app);
    acme = await jobs.company("Acme Inc");
  });

  const queue = async () =>
    (
      await app.findJobs(OWNER, {
        reviewState: "pending",
        limit: 20,
        offset: 0,
      })
    ).jobs.map((job) => job.id);
  const pipeline = async () =>
    (
      await app.findJobs(OWNER, {
        reviewState: "accepted",
        limit: 20,
        offset: 0,
      })
    ).jobs.map((job) => job.id);

  // Sets Hector's cap on pending proposals.
  const capAt = (pendingCap: number) =>
    app.updateSettings(HECTOR, {
      targets: DEFAULT_SETTINGS.targets,
      pendingCap,
      updatedAt: null,
    });

  it("leaves Claude's proposal pending in the queue, out of the pipeline, with its reason and the source it names", async () => {
    const proposed = await jobs.propose(acme, {
      level: "senior",
      workMode: "remote",
      payMin: 12_345,
      payMax: 67_890,
      summary: "A fictional posting for a widget engineer.",
    });

    expect(proposed).toMatchObject({
      role: "Widget engineer",
      company: { id: acme, name: "Acme Inc" },
      source: { name: "Widget Jobs" },
      status: "verify",
      reviewState: "pending",
      proposalReason: "Matches the target role",
      level: "senior",
      workMode: "remote",
      payMin: 12_345,
      payMax: 67_890,
      foundOn: todayIn(PLAN_TIME_ZONE),
      appliedOn: null,
    });
    expect(await queue()).toEqual([proposed.id]);
    expect(await pipeline()).toEqual([]);
    expect((await app.listSources(OWNER)).map((source) => source.name)).toEqual(
      ["Widget Jobs"],
    );
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "job", id: proposed.id },
      limit: 20,
      offset: 0,
    });
    expect(entries).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "propose_job",
        action: "created",
      }),
    ]);
  });

  it("accepts a job Hector adds at once, in verify, its posting link optional", async () => {
    const added = await jobs.add(acme);

    expect(added).toMatchObject({
      reviewState: "accepted",
      status: "verify",
      postingUrl: null,
      proposalReason: null,
    });
    expect(await pipeline()).toEqual([added.id]);
  });

  // AE1.
  it("refuses a posting a dismissed job holds, tracking aside, with the dismissal's reason, and adds nothing", async () => {
    const posting = "https://www.linkedin.com/jobs/view/4242";
    const first = await jobs.propose(acme, { postingUrl: posting });
    await app.reviewProposal(HECTOR, {
      id: first.id,
      decision: "dismiss",
      reason: "not-hiring",
      note: null,
    });

    const refusal = await jobs
      .propose(acme, {
        postingUrl: `${posting}?refId=abc&trk=public_jobs&utm_source=feed`,
      })
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(DuplicateError);
    expect((refusal as DuplicateError).existing).toEqual({
      id: first.id,
      role: "Widget engineer",
      company: "Acme Inc",
      reviewState: "dismissed",
      dismissReason: "not-hiring",
    });
    expect((refusal as DuplicateError).message).toBe(
      "This posting was dismissed (not hiring): Widget engineer at Acme Inc.",
    );
    expect(await queue()).toEqual([]);
  });

  it("refuses Hector's add of a posting a pending or dismissed proposal holds, naming the job and its review", async () => {
    const pending = await jobs.propose(acme);
    const dismissed = await jobs.propose(acme);
    await app.reviewProposal(HECTOR, {
      id: dismissed.id,
      decision: "dismiss",
      reason: "wrong-level",
      note: null,
    });

    for (const [held, reviewState] of [
      [pending, "pending"],
      [dismissed, "dismissed"],
    ] as const) {
      const refusal = await jobs
        .add(acme, { postingUrl: held.postingUrl })
        .catch((err: unknown) => err);
      expect(refusal).toBeInstanceOf(DuplicateError);
      expect((refusal as DuplicateError).existing).toMatchObject({
        id: held.id,
        reviewState,
      });
    }
    expect(await pipeline()).toEqual([]);
  });

  it("refuses a proposal once the queue holds as many as Hector's cap, and still takes his own adds", async () => {
    await capAt(1);
    await jobs.propose(acme);

    await expect(jobs.propose(acme)).rejects.toBeInstanceOf(QueueFullError);
    expect(await queue()).toHaveLength(1);
    await jobs.add(acme);
  });

  it("lands one of two proposals of the same posting made at once, and refuses the other as a duplicate", async () => {
    const posting = newPosting();

    const outcomes = await Promise.allSettled([
      jobs.propose(acme, { postingUrl: posting }),
      jobs.propose(acme, { postingUrl: posting }),
    ]);

    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(
      outcomes.find((outcome) => outcome.status === "rejected")?.reason,
    ).toBeInstanceOf(DuplicateError);
    expect(await queue()).toHaveLength(1);
  });

  it("lands one of two proposals made at once with one slot left, and refuses the other as queue-full", async () => {
    await capAt(2);
    await jobs.propose(acme);

    const outcomes = await Promise.allSettled([
      jobs.propose(acme),
      jobs.propose(acme),
    ]);

    expect(
      outcomes.find((outcome) => outcome.status === "rejected")?.reason,
    ).toBeInstanceOf(QueueFullError);
    expect(await queue()).toHaveLength(2);
  });

  it("finds the source by name in any case, and can't name another owner's company", async () => {
    await jobs.propose(acme, { source: "widget jobs" });
    expect(await app.listSources(OWNER)).toHaveLength(1);

    const theirs = await jobs.company("Acme Inc", ANOTHER_OWNER);
    await expect(jobs.propose(theirs)).rejects.toBeInstanceOf(NotFoundError);
  });
});
