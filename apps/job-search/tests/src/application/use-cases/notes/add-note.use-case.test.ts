import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import type { Job } from "@/src/entities/models/job.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR, jobFixtures } from "@/tests/_support/jobs";

describeEachBackend("addNote", () => {
  let app: TestApp;
  let job: Job;

  beforeEach(async () => {
    app = makeApp();
    const jobs = jobFixtures(app);
    job = await jobs.add(await jobs.company());
  });

  it("takes Claude's notes and Hector's, dated and signed, listed newest first, each logged as its own record", async () => {
    const first = await app.addNote(CLAUDE, {
      record: { kind: "job", id: job.id },
      body: "Saw the posting on a job board.",
    });
    await Bun.sleep(5);
    const second = await app.addNote(HECTOR, {
      record: { kind: "job", id: job.id },
      body: "Asked a friend there.",
    });

    expect(first).toMatchObject({
      record: { kind: "job", id: job.id },
      author: "agent",
      body: "Saw the posting on a job board.",
      createdAt: expect.any(Date),
    });
    expect(
      (await app.repos.notes.list(OWNER, { kind: "job", id: job.id })).map(
        (note) => note.id,
      ),
    ).toEqual([second.id, first.id]);
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "note", id: first.id },
      limit: 20,
      offset: 0,
    });
    expect(entries).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "propose_job",
        action: "created",
        changes: [
          {
            field: "body",
            before: null,
            after: "Saw the posting on a job board.",
          },
        ],
      }),
    ]);
  });

  it("can't go on a job that isn't the owner's", async () => {
    await expect(
      app.addNote(CLAUDE, {
        record: { kind: "job", id: crypto.randomUUID() },
        body: "Nowhere",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
