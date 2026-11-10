import { beforeEach, expect, it } from "bun:test";
import {
  ConflictError,
  DuplicateError,
  HumanOnlyError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type Job, updateJobSchema } from "@/src/entities/models/job.model";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import {
  HECTOR,
  jobFixtures,
  newPosting,
  watchPostingReads,
} from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "update_job",
};

// update_job's input as its controller reads it, against what was read.
const changeTo = (job: Job, facts: Record<string, unknown>) =>
  updateJobSchema.parse({
    id: job.id,
    updatedAt: job.updatedAt.toISOString(),
    ...facts,
  });

describeEachBackend("updateJob", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;
  let job: Job;

  beforeEach(async () => {
    app = makeApp();
    jobs = jobFixtures(app);
    job = await jobs.add(await jobs.company(), {
      location: "Springfield",
      workMode: "hybrid",
    });
  });

  it("changes only the facts given, a source by name, and logs each that changed", async () => {
    const updated = await app.updateJob(
      CLAUDE,
      changeTo(job, {
        location: "Shelbyville",
        workMode: "hybrid",
        level: "staff",
        source: "Gadget Board",
      }),
    );

    expect(updated).toMatchObject({
      location: "Shelbyville",
      workMode: "hybrid",
      level: "staff",
      source: { name: "Gadget Board" },
    });
    const [latest] = (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: job.id },
        limit: 1,
        offset: 0,
      })
    ).entries;
    expect(latest?.changes).toEqual([
      { field: "source", before: "Referral", after: "Gadget Board" },
      { field: "level", before: null, after: "staff" },
      { field: "location", before: "Springfield", after: "Shelbyville" },
    ]);
  });

  // R1 as revised 2026-11-07 (the UX plan's Q1): a next step always carries a date.
  it("dates a step a change leaves with no date a week out", async () => {
    const updated = await app.updateJob(
      HECTOR,
      changeTo(job, { nextStep: "Call the recruiter", nextDate: null }),
    );

    expect(updated).toMatchObject({
      nextStep: "Call the recruiter",
      nextDate: addDays(todayIn(PLAN_TIME_ZONE), 7),
    });
  });

  it("leaves an old step with no date as it is when a change sets neither the step nor the date", async () => {
    // As an import left one, before the rule.
    const undated = await app.repos.transactions.startTransaction((tx) =>
      app.repos.jobs.update(
        OWNER,
        job.id,
        { nextStep: "Ask about the team", nextDate: null },
        tx,
      ),
    );

    const updated = await app.updateJob(
      HECTOR,
      changeTo(undated, { location: "Shelbyville" }),
    );

    expect(updated).toMatchObject({
      nextStep: "Ask about the team",
      nextDate: null,
    });
  });

  it("refuses Claude's change against an old updatedAt with the job as it is now", async () => {
    const hectors = await app.updateJob(
      HECTOR,
      changeTo(job, { nextStep: "Ask for a referral" }),
    );

    const refusal = await app
      .updateJob(CLAUDE, changeTo(job, { nextStep: "Apply" }))
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(ConflictError);
    expect((refusal as ConflictError).current).toEqual(hectors);
  });

  it("refuses applied-on from Claude, which moves the status instead, and takes it from Hector", async () => {
    await expect(
      app.updateJob(CLAUDE, changeTo(job, { appliedOn: "2026-10-20" })),
    ).rejects.toThrow(
      "Applied-on changes with a dated status move: use set_job_status.",
    );

    const set = await app.updateJob(
      HECTOR,
      changeTo(job, { appliedOn: "2026-10-20" }),
    );
    expect(set.appliedOn).toBe("2026-10-20");
  });

  it("refuses a posting link another job holds, and a band whose top is below its bottom", async () => {
    const posting = newPosting();
    await jobs.add(job.company.id, { postingUrl: posting });

    await expect(
      app.updateJob(HECTOR, changeTo(job, { postingUrl: posting })),
    ).rejects.toBeInstanceOf(DuplicateError);

    const banded = await app.updateJob(
      HECTOR,
      changeTo(job, { payMin: 67_890 }),
    );
    await expect(
      app.updateJob(HECTOR, changeTo(banded, { payMax: 12_345 })),
    ).rejects.toBeInstanceOf(InputParseError);
  });

  it("leaves the job as it is, logging nothing, when a change sets what it already holds", async () => {
    const same = await app.updateJob(
      CLAUDE,
      changeTo(job, { location: "Springfield", source: "referral" }),
    );

    expect(same).toEqual(job);
    expect(
      (
        await app.listActivity(OWNER, {
          record: { kind: "job", id: job.id },
          limit: 20,
          offset: 0,
        })
      ).entries,
    ).toHaveLength(1);
  });

  it("clears one end of the band while the other crosses where it was", async () => {
    const banded = await app.updateJob(
      HECTOR,
      changeTo(job, { payMin: 67_890, payMax: 99_999 }),
    );

    expect(
      await app.updateJob(
        HECTOR,
        changeTo(banded, { payMin: null, payMax: 12_345 }),
      ),
    ).toMatchObject({ payMin: null, payMax: 12_345 });
  });

  it("moves a job's posting link: the old posting is free, the new one taken, and the job's own written another way is no duplicate", async () => {
    const first = newPosting();
    const second = newPosting();
    const linked = await app.updateJob(
      HECTOR,
      changeTo(job, { postingUrl: first }),
    );
    const moved = await app.updateJob(
      HECTOR,
      changeTo(linked, { postingUrl: second }),
    );

    expect(moved.postingUrl).toBe(second);
    await expect(
      jobs.byClaude(job.company.id, {
        postingUrl: `${second}?utm_source=feed`,
      }),
    ).rejects.toBeInstanceOf(DuplicateError);
    expect(
      (await jobs.byClaude(job.company.id, { postingUrl: first })).postingUrl,
    ).toBe(first);

    const tracked = await app.updateJob(
      HECTOR,
      changeTo(moved, { postingUrl: `${second}?gh_src=feed` }),
    );
    expect(tracked.postingUrl).toBe(`${second}?gh_src=feed`);

    const cleared = await app.updateJob(
      HECTOR,
      changeTo(tracked, { postingUrl: null }),
    );
    expect(cleared.postingUrl).toBeNull();
    expect(
      (await jobs.byClaude(job.company.id, { postingUrl: second })).postingUrl,
    ).toBe(second);
  });

  it("moves a job to another of the owner's companies, and never to another owner's", async () => {
    const globex = await jobs.company("Globex Corp");
    const moved = await app.updateJob(
      CLAUDE,
      changeTo(job, { companyId: globex }),
    );
    expect(moved.company).toMatchObject({ id: globex, name: "Globex Corp" });

    const theirs = await jobs.company("Initech", ANOTHER_OWNER);
    await expect(
      app.updateJob(CLAUDE, changeTo(moved, { companyId: theirs })),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await app.getJob(OWNER, { id: job.id })).job.company.id).toBe(
      globex,
    );
  });

  // KTD3: update_job changes facts: a status or a pin in its input goes.
  it("takes no status or pin from a change", async () => {
    expect(
      await app.updateJob(
        CLAUDE,
        changeTo(job, {
          role: "Gadget tester",
          status: "applied",
          pinnedAt: new Date().toISOString(),
        }),
      ),
    ).toMatchObject({
      role: "Gadget tester",
      status: "verify",
      pinnedAt: null,
    });
  });

  it("sets and clears the sweep's facts: the posting's date, the fit score and Claude's reason", async () => {
    const scored = await app.updateJob(
      CLAUDE,
      changeTo(job, {
        postedOn: "2026-01-02",
        score: 9,
        reason: "A closer match than first read",
      }),
    );
    expect(scored).toMatchObject({
      postedOn: "2026-01-02",
      score: 9,
      reason: "A closer match than first read",
    });

    expect(
      await app.updateJob(
        CLAUDE,
        changeTo(scored, { postedOn: null, score: null, reason: null }),
      ),
    ).toMatchObject({ postedOn: null, score: null, reason: null });
  });

  // R21 as revised 2026-11-10, KTD3: a posting Hector passed on stays refused unless he frees it.
  it("refuses Claude's change to an archived job's posting link as Hector's, logging the refusal, and takes its other changes and Hector's", async () => {
    const posting = newPosting();
    const linked = await app.updateJob(
      HECTOR,
      changeTo(job, { postingUrl: posting }),
    );
    const archived = await app.moveJob(HECTOR, {
      id: job.id,
      status: "skipped",
      reason: "Not a fit",
    });

    for (const change of [{ postingUrl: null }, { postingUrl: newPosting() }]) {
      await expect(
        app.updateJob(CLAUDE, changeTo(archived, change)),
      ).rejects.toBeInstanceOf(HumanOnlyError);
    }
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
      reason: "relink",
    });
    await expect(
      jobs.byClaude(job.company.id, { postingUrl: posting }),
    ).rejects.toBeInstanceOf(DuplicateError);

    const renamed = await app.updateJob(
      CLAUDE,
      changeTo(archived, { role: "Gadget tester", postingUrl: posting }),
    );
    expect(renamed).toMatchObject({
      role: "Gadget tester",
      postingUrl: linked.postingUrl,
    });
    expect(
      await app.updateJob(HECTOR, changeTo(renamed, { postingUrl: null })),
    ).toMatchObject({ postingUrl: null, status: "skipped" });
  });

  it("takes the posting lock before it looks for a duplicate of a new link", async () => {
    const calls = watchPostingReads(app);

    await app.updateJob(HECTOR, changeTo(job, { postingUrl: newPosting() }));

    expect(calls).toEqual(["lockPostings", "findByPostingKey"]);
  });
});
