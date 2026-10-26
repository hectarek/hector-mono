import { beforeEach, expect, it } from "bun:test";
import { HumanOnlyError, NotFoundError } from "@/src/entities/errors/common";
import type { Job } from "@/src/entities/models/job.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR, jobFixtures } from "@/tests/_support/jobs";

describeEachBackend("deleteJob", () => {
  let app: TestApp;
  let job: Job;

  beforeEach(async () => {
    app = makeApp();
    const jobs = jobFixtures(app);
    job = await jobs.add(await jobs.company());
    await app.moveJob(HECTOR, { id: job.id, status: "target" });
    await app.addNote(CLAUDE, {
      record: { kind: "job", id: job.id },
      body: "A fictional note.",
    });
  });

  it("deletes Hector's job with its status moves and notes, its history keeping its facts", async () => {
    expect(await app.deleteJob(HECTOR, { id: job.id })).toEqual({
      id: job.id,
      role: "Widget engineer",
    });

    await expect(app.getJob(OWNER, { id: job.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await app.repos.jobs.listStatusChanges(OWNER, job.id)).toEqual([]);
    expect(
      await app.repos.notes.list(OWNER, { kind: "job", id: job.id }),
    ).toEqual([]);
    const [latest] = (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: job.id },
        limit: 1,
        offset: 0,
      })
    ).entries;
    expect(latest).toMatchObject({ actor: "owner", action: "deleted" });
    expect(latest?.changes).toContainEqual({
      field: "role",
      before: "Widget engineer",
      after: null,
    });
  });

  it("refuses Claude with HumanOnlyError, logs the refusal, and keeps the job", async () => {
    await expect(app.deleteJob(CLAUDE, { id: job.id })).rejects.toBeInstanceOf(
      HumanOnlyError,
    );

    expect((await app.getJob(OWNER, { id: job.id })).job.id).toBe(job.id);
    const [latest] = (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: job.id },
        limit: 1,
        offset: 0,
      })
    ).entries;
    expect(latest).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "delete",
    });
  });
});
