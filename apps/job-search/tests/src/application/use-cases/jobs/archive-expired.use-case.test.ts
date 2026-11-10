import {
  afterEach,
  beforeEach,
  expect,
  it,
  setSystemTime,
  spyOn,
} from "bun:test";
import { addDays } from "@/src/entities/week";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

// Noon on 2026-10-26 in New York.
const TODAY = "2026-10-26";

describeEachBackend("archiveExpired", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;
  let acme: string;

  beforeEach(async () => {
    setSystemTime(new Date("2026-10-26T16:00:00Z"));
    app = makeApp();
    jobs = jobFixtures(app);
    acme = await jobs.company();
  });

  afterEach(() => {
    setSystemTime();
  });

  const postedDaysAgo = (days: number, role = "Widget engineer") =>
    jobs.byClaude(acme, { role, postedOn: addDays(TODAY, -days) });

  // KTD24.
  it("archives an unpinned job whose posting is 22 days old as skipped, Not picked in time, by the system, and a second run does nothing", async () => {
    const old = await postedDaysAgo(22);

    expect(await app.archiveExpired(OWNER)).toEqual({ archived: [old.id] });

    expect((await app.getJob(OWNER, { id: old.id })).job).toMatchObject({
      status: "skipped",
      nextStep: null,
    });
    expect(await app.repos.jobs.listStatusChanges(OWNER, old.id)).toEqual([
      expect.objectContaining({
        from: "verify",
        to: "skipped",
        on: TODAY,
        actor: "system",
      }),
    ]);
    const [logged] = (
      await app.listActivity(OWNER, {
        record: { kind: "job", id: old.id },
        limit: 20,
        offset: 0,
      })
    ).entries;
    expect(logged).toMatchObject({
      actor: "system",
      action: "updated",
      reason: "Not picked in time",
    });

    expect(await app.archiveExpired(OWNER)).toEqual({ archived: [] });
  });

  it("goes by the day a job was found when its posting gave no date", async () => {
    const found = await jobs.add(acme, { foundOn: addDays(TODAY, -30) });

    expect(await app.archiveExpired(OWNER)).toEqual({ archived: [found.id] });
  });

  it("leaves a pinned job of the same age, one 21 days old, one applied to, and another owner's", async () => {
    const pinned = await postedDaysAgo(22, "Pinned");
    await app.pinJob(HECTOR, { id: pinned.id, pinned: true });
    await postedDaysAgo(21, "Three weeks old");
    const applied = await postedDaysAgo(30, "Applied");
    await app.moveJob(HECTOR, { id: applied.id, status: "applied" });
    await jobs.add(
      await jobs.company("Acme Inc", ANOTHER_OWNER),
      { role: "Theirs", foundOn: addDays(TODAY, -30) },
      { actor: "owner", ownerId: ANOTHER_OWNER },
    );

    expect(await app.archiveExpired(OWNER)).toEqual({ archived: [] });
  });

  it("leaves a job changed since the run read it, for the next run", async () => {
    const old = await postedDaysAgo(22);
    // The run reads the job before Hector pins it.
    const read = spyOn(app.repos.jobs, "listToApply").mockImplementation(
      async () => [old],
    );
    await app.pinJob(HECTOR, { id: old.id, pinned: true });

    expect(await app.archiveExpired(OWNER)).toEqual({ archived: [] });

    expect((await app.getJob(OWNER, { id: old.id })).job.status).toBe("verify");
    read.mockRestore();
  });
});
