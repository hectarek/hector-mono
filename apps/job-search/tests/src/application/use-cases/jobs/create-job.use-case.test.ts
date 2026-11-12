import { beforeEach, expect, it } from "bun:test";
import {
  DuplicateError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import {
  CLAUDE,
  HECTOR,
  jobFixtures,
  newPosting,
  watchPostingReads,
} from "@/tests/_support/jobs";

describeEachBackend("createJob", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;
  let acme: string;

  beforeEach(async () => {
    app = makeApp();
    jobs = jobFixtures(app);
    acme = await jobs.company("Acme Inc");
  });

  // The ranked list's jobs, by id (R27).
  const toApply = async () =>
    (
      await app.findJobs(OWNER, { status: "to-apply", limit: 50, offset: 0 })
    ).jobs.map((job) => job.id);

  it("puts Claude's job straight on the ranked list, in verify with no next step, with its reason, score, posting date and the source it names", async () => {
    const added = await jobs.byClaude(acme, {
      level: "senior",
      workMode: "remote",
      payMin: 12_345,
      payMax: 67_890,
      postedOn: "2026-01-02",
      score: 8,
      summary: "A fictional posting for a widget engineer.",
    });

    expect(added).toMatchObject({
      role: "Widget engineer",
      company: { id: acme, name: "Acme Inc" },
      source: { name: "Widget Jobs" },
      status: "verify",
      reason: "Matches the target role",
      score: 8,
      postedOn: "2026-01-02",
      pinnedAt: null,
      nextStep: null,
      nextDate: null,
      level: "senior",
      workMode: "remote",
      payMin: 12_345,
      payMax: 67_890,
      foundOn: todayIn(PLAN_TIME_ZONE),
      appliedOn: null,
    });
    expect((await app.listSources(OWNER)).map((source) => source.name)).toEqual(
      ["Widget Jobs"],
    );
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "job", id: added.id },
      limit: 20,
      offset: 0,
    });
    expect(entries).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "add_job",
        action: "created",
      }),
    ]);
  });

  it("puts a job Hector adds on the list the same way, its posting link and reason optional", async () => {
    const added = await jobs.add(acme);

    expect(added).toMatchObject({
      status: "verify",
      postingUrl: null,
      reason: null,
      score: null,
      nextStep: null,
      nextDate: null,
    });
    expect(await toApply()).toEqual([added.id]);
  });

  it("dates a step given with no date a week out, for Hector's job and Claude's alike", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const hectors = await jobs.add(acme, { nextStep: "Ask for a referral" });
    const claudes = await jobs.byClaude(acme, {
      nextStep: "Read the team page",
    });

    expect(hectors.nextDate).toBe(addDays(today, 7));
    expect(claudes.nextDate).toBe(addDays(today, 7));
  });

  // R20 as revised 2026-11-10: no cap, since the rank orders the list.
  it("takes as many of Claude's jobs as it finds", async () => {
    for (let found = 0; found < 11; found++) {
      await jobs.byClaude(acme);
    }

    expect(await toApply()).toHaveLength(11);
  });

  // AE1 as revised 2026-11-10.
  it("refuses a posting a job archived as Not for me holds, tracking aside, naming the archived job, and adds nothing", async () => {
    const posting = "https://www.linkedin.com/jobs/view/4242";
    const first = await jobs.byClaude(acme, { postingUrl: posting });
    await app.moveJob(HECTOR, {
      id: first.id,
      status: "skipped",
      reason: "Not a fit",
    });

    const refusal = await jobs
      .byClaude(acme, {
        postingUrl: `${posting}?refId=abc&trk=public_jobs&utm_source=feed`,
      })
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(DuplicateError);
    expect((refusal as DuplicateError).existing).toEqual({
      id: first.id,
      role: "Widget engineer",
      company: "Acme Inc",
      status: "skipped",
    });
    expect((refusal as DuplicateError).message).toBe(
      "This posting is on an archived job: Widget engineer at Acme Inc.",
    );
    expect(await toApply()).toEqual([]);
  });

  it("refuses Hector's add of a posting an open job holds, naming it", async () => {
    const held = await jobs.byClaude(acme);

    const refusal = await jobs
      .add(acme, { postingUrl: held.postingUrl })
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(DuplicateError);
    expect((refusal as DuplicateError).existing).toMatchObject({
      id: held.id,
      status: "verify",
    });
    expect((refusal as DuplicateError).message).toBe(
      "This posting is already a job: Widget engineer at Acme Inc.",
    );
    expect(await toApply()).toEqual([held.id]);
  });

  it("lands one of two adds of the same posting made at once, and refuses the other as a duplicate", async () => {
    const posting = newPosting();

    const outcomes = await Promise.allSettled([
      jobs.byClaude(acme, { postingUrl: posting }),
      jobs.byClaude(acme, { postingUrl: posting }),
    ]);

    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    expect(
      outcomes.find((outcome) => outcome.status === "rejected")?.reason,
    ).toBeInstanceOf(DuplicateError);
    expect(await toApply()).toHaveLength(1);
  });

  it("finds the source by name in any case, and can't name another owner's company", async () => {
    await jobs.byClaude(acme, { source: "widget jobs" });
    expect(await app.listSources(OWNER)).toHaveLength(1);

    const theirs = await jobs.company("Acme Inc", ANOTHER_OWNER);
    await expect(jobs.byClaude(theirs)).rejects.toBeInstanceOf(NotFoundError);
  });

  // R20, KTD3: Claude's job carries its posting's link, for the duplicate rule, and its reason, for
  // Hector, whatever the entry point (the add-job form included).
  it("refuses Claude's job without a posting link or a reason, and adds nothing", async () => {
    for (const input of [{}, { postingUrl: newPosting() }]) {
      await expect(jobs.add(acme, input, CLAUDE)).rejects.toThrow(
        new InputParseError(
          "A job Claude adds needs the posting's link and a reason.",
        ),
      );
    }
    expect(await toApply()).toEqual([]);
  });

  // KTD8: on the database's own connections only the posting lock keeps two writes apart.
  it("takes the posting lock before it looks for a duplicate", async () => {
    const calls = watchPostingReads(app);

    await jobs.byClaude(acme);

    expect(calls).toEqual(["lockPostings", "findByPostingKey"]);
  });
});
