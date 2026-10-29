import { beforeEach, expect, it } from "bun:test";
import {
  ConflictError,
  DuplicateError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type Job, updateJobSchema } from "@/src/entities/models/job.model";
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
  watchQueueReads,
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
      jobs.propose(job.company.id, { postingUrl: `${second}?utm_source=feed` }),
    ).rejects.toBeInstanceOf(DuplicateError);
    expect(
      (await jobs.propose(job.company.id, { postingUrl: first })).postingUrl,
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
      (await jobs.propose(job.company.id, { postingUrl: second })).postingUrl,
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

  // KTD3: update_job changes facts: a status or a review in its input goes.
  it("takes no status or review from a change, so Claude's proposal stays pending", async () => {
    const proposal = await jobs.propose(job.company.id);

    expect(
      await app.updateJob(
        CLAUDE,
        changeTo(proposal, {
          role: "Gadget tester",
          status: "applied",
          reviewState: "accepted",
        }),
      ),
    ).toMatchObject({
      role: "Gadget tester",
      status: "verify",
      reviewState: "pending",
    });
  });

  // R20, KTD3: a dismissed posting stays refused until Hector reopens its proposal.
  it("refuses Claude's change to a dismissed proposal, so its posting stays refused, and takes Hector's", async () => {
    const posting = newPosting();
    const proposal = await jobs.propose(job.company.id, {
      postingUrl: posting,
    });
    const dismissed = await app.reviewProposal(HECTOR, {
      id: proposal.id,
      updatedAt: proposal.updatedAt,
      decision: "dismiss",
      reason: "not-hiring",
      note: null,
    });

    for (const change of [
      { postingUrl: null },
      { postingUrl: newPosting() },
      { role: "Gadget tester" },
    ]) {
      await expect(
        app.updateJob(CLAUDE, changeTo(dismissed, change)),
      ).rejects.toThrow(
        new InputParseError(
          "A dismissed proposal changes once Hector reopens it.",
        ),
      );
    }
    await expect(
      jobs.propose(job.company.id, { postingUrl: posting }),
    ).rejects.toBeInstanceOf(DuplicateError);
    expect(
      await app.updateJob(
        HECTOR,
        changeTo(dismissed, { role: "Gadget tester" }),
      ),
    ).toMatchObject({ role: "Gadget tester", reviewState: "dismissed" });
  });

  it("takes the queue's lock before it looks for a duplicate of a new link", async () => {
    const calls = watchQueueReads(app);

    await app.updateJob(HECTOR, changeTo(job, { postingUrl: newPosting() }));

    expect(calls).toEqual(["lockQueue", "findByPostingKey"]);
  });
});
