import { beforeEach, expect, it } from "bun:test";
import {
  ConflictError,
  DuplicateError,
  InputParseError,
} from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type Job, updateJobSchema } from "@/src/entities/models/job.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures, newPosting } from "@/tests/_support/jobs";

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
});
