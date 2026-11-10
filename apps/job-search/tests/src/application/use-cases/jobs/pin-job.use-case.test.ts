import { beforeEach, expect, it } from "bun:test";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { Job } from "@/src/entities/models/job.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "pin_job",
};

describeEachBackend("pinJob", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;
  let job: Job;

  beforeEach(async () => {
    app = makeApp();
    jobs = jobFixtures(app);
    job = await jobs.byClaude(await jobs.company());
  });

  const history = async () =>
    (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: job.id },
        limit: 20,
        offset: 0,
      })
    ).entries;

  it("pins a job not yet applied to, logs it, and a second pin changes nothing", async () => {
    const pinned = await app.pinJob(HECTOR, { id: job.id, pinned: true });

    expect(pinned.pinnedAt).toBeInstanceOf(Date);
    const [logged] = await history();
    expect(logged).toMatchObject({
      actor: "owner",
      action: "updated",
      changes: [{ field: "pinned", before: false, after: true }],
    });

    expect(await app.pinJob(HECTOR, { id: job.id, pinned: true })).toEqual(
      pinned,
    );
    expect(await history()).toHaveLength(2);
  });

  it("unpins, and an unpin of a job that isn't pinned changes nothing", async () => {
    await app.pinJob(HECTOR, { id: job.id, pinned: true });

    expect(
      (await app.pinJob(HECTOR, { id: job.id, pinned: false })).pinnedAt,
    ).toBeNull();
    const unpinned = await app.pinJob(HECTOR, { id: job.id, pinned: false });
    expect(unpinned.pinnedAt).toBeNull();
    expect(await history()).toHaveLength(3);
  });

  // R27: Hector pins, and Claude on his word.
  it("takes Claude's pin, logged as Claude's", async () => {
    await app.pinJob(CLAUDE, { id: job.id, pinned: true });

    const [logged] = await history();
    expect(logged).toMatchObject({ actor: "agent", tool: "pin_job" });
  });

  it("refuses to pin a job applied to or archived, and still unpins one", async () => {
    await app.pinJob(HECTOR, { id: job.id, pinned: true });
    await app.moveJob(HECTOR, { id: job.id, status: "applied" });
    const refused = new InputParseError(
      "Only a job not yet applied to can be pinned.",
    );

    expect(
      (await app.pinJob(HECTOR, { id: job.id, pinned: false })).pinnedAt,
    ).toBeNull();
    await expect(
      app.pinJob(HECTOR, { id: job.id, pinned: true }),
    ).rejects.toThrow(refused);
    await app.moveJob(HECTOR, {
      id: job.id,
      status: "withdrawn",
      reason: "Took another path",
    });
    await expect(
      app.pinJob(HECTOR, { id: job.id, pinned: true }),
    ).rejects.toThrow(refused);
  });

  it("can't reach another owner's job", async () => {
    await expect(
      app.pinJob(
        { actor: "owner", ownerId: ANOTHER_OWNER },
        { id: job.id, pinned: true },
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await app.getJob(OWNER, { id: job.id })).job.pinnedAt).toBeNull();
  });
});
