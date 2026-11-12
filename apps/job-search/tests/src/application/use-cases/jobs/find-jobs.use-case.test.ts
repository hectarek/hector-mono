import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import type { JobQuery } from "@/src/entities/models/job.model";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import { addDays } from "@/src/entities/week";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

const query = (narrower: Partial<JobQuery> = {}): JobQuery => ({
  limit: 20,
  offset: 0,
  ...narrower,
});

describeEachBackend("findJobs", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;
  let acme: string;

  beforeEach(async () => {
    app = makeApp();
    jobs = jobFixtures(app);
    acme = await jobs.company("Acme Inc");
  });

  const roles = async (narrower?: Partial<JobQuery>) =>
    (await app.findJobs(OWNER, query(narrower))).jobs.map((job) => job.role);

  it("lists jobs by next date, then role, as a list shows them", async () => {
    await jobs.add(acme, { role: "Gadget designer" });
    await jobs.add(acme, { role: "Widget engineer", nextDate: "2026-11-02" });
    await jobs.add(acme, { role: "Anvil tester", nextDate: "2026-10-30" });
    await jobs.add(acme, { role: "Bolt fitter" });

    expect(await roles()).toEqual([
      "Anvil tester",
      "Widget engineer",
      "Bolt fitter",
      "Gadget designer",
    ]);
    const [first] = (await app.findJobs(OWNER, query())).jobs;
    expect(first).toEqual({
      id: expect.any(String),
      role: "Anvil tester",
      company: { id: acme, name: "Acme Inc", tier: null },
      status: "verify",
      nextStep: null,
      nextDate: "2026-10-30",
      appliedOn: null,
      location: null,
      workMode: null,
      payMin: null,
      payMax: null,
      postedOn: null,
      foundOn: expect.any(String),
      score: null,
      reason: null,
      pinnedAt: null,
      updatedAt: expect.any(Date),
    });
  });

  // By code point, as the mock sorts (collate "C"): capitals before lower case, and accents last.
  it("orders roles by code point on both backends", async () => {
    for (const role of [
      "anvil tester",
      "Bolt fitter",
      "Éclair baker",
      "Anvil tester",
    ]) {
      await jobs.add(acme, { role });
    }

    expect(await roles()).toEqual([
      "Anvil tester",
      "Bolt fitter",
      "anvil tester",
      "Éclair baker",
    ]);
  });

  it("narrows to open or archived jobs, one status, or one company", async () => {
    const open = await jobs.add(acme, { role: "Open role" });
    const withdrawn = await jobs.add(acme, { role: "Withdrawn role" });
    await app.moveJob(HECTOR, {
      id: withdrawn.id,
      status: "withdrawn",
      reason: "Took another path",
    });
    const filled = await jobs.add(acme, { role: "Filled role" });
    await app.moveJob(HECTOR, {
      id: filled.id,
      status: "closed",
      reason: "Role filled",
    });
    const globex = await jobs.company("Globex");
    await jobs.add(globex, { role: "Globex role" });
    await app.moveJob(HECTOR, { id: open.id, status: "target" });

    // Archived is every ended status, and closed the one, the posting's (the UX plan's Q6).
    expect(await roles({ status: "archived" })).toEqual([
      "Filled role",
      "Withdrawn role",
    ]);
    expect(await roles({ status: "closed" })).toEqual(["Filled role"]);
    // Open role's move to target dated its step; the others have none.
    expect(await roles({ status: "open" })).toEqual([
      "Open role",
      "Globex role",
    ]);
    expect(await roles({ status: "target" })).toEqual(["Open role"]);
    expect(await roles({ companyId: globex })).toEqual(["Globex role"]);
  });

  // The UX plan's UX6: the steps with no date, which Today never shows as due.
  it("lists a job whose step has no date after the dated ones, and narrows to those alone", async () => {
    await jobs.add(acme, { role: "Dated role" });
    const undated = await jobs.add(acme, { role: "Undated role" });
    // As an import left one, before the rule.
    await app.repos.transactions.startTransaction((tx) =>
      app.repos.jobs.update(
        OWNER,
        undated.id,
        { nextStep: "Ask about the team", nextDate: null },
        tx,
      ),
    );

    expect(await roles()).toEqual(["Dated role", "Undated role"]);
    expect(await roles({ undated: true })).toEqual(["Undated role"]);
  });

  it("answers a page at a time, and keeps another owner's jobs out", async () => {
    for (const role of ["A role", "B role", "C role"]) {
      await jobs.add(acme, { role });
    }
    await jobs.add(
      await jobs.company("Acme Inc", ANOTHER_OWNER),
      { role: "Theirs" },
      { actor: "owner", ownerId: ANOTHER_OWNER },
    );

    const first = await app.findJobs(OWNER, query({ limit: 2 }));
    expect(first.jobs.map((job) => job.role)).toEqual(["A role", "B role"]);
    expect(first.nextOffset).toBe(2);
    expect(await roles({ limit: 2, offset: 2 })).toEqual(["C role"]);
  });
});

// Noon on 2026-10-26 in New York, so postings' ages are fixed.
const TODAY = "2026-10-26";

describeEachBackend("findJobs, the ranked list", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;
  let acme: string;

  beforeEach(async () => {
    setSystemTime(new Date("2026-10-26T16:00:00Z"));
    app = makeApp();
    jobs = jobFixtures(app);
    acme = await jobs.company("Acme Inc");
  });

  afterEach(() => {
    setSystemTime();
  });

  const ranked = async (narrower: Partial<JobQuery> = {}) =>
    (
      await app.findJobs(OWNER, query({ status: "to-apply", ...narrower }))
    ).jobs.map((job) => job.role);

  // At a later moment the same day, so each pin is newer than the last.
  const pinAt = async (time: string, id: string) => {
    setSystemTime(new Date(`2026-10-26T${time}Z`));
    await app.pinJob(HECTOR, { id, pinned: true });
  };

  // R27, KTD23, KTD24.
  it("orders the jobs not yet applied to: pinned, the latest pin first, then targets, then by priority, leaving out the expired, the applied and another owner's", async () => {
    await jobs.byClaude(acme, { role: "Low fit", score: 4, postedOn: TODAY });
    await jobs.byClaude(acme, { role: "High fit", score: 9, postedOn: TODAY });
    await jobs.byClaude(acme, {
      role: "Old posting",
      score: 10,
      postedOn: addDays(TODAY, -22),
    });
    const pick = await jobs.add(acme, { role: "Hector's pick" });
    await app.moveJob(HECTOR, { id: pick.id, status: "target" });
    const first = await jobs.byClaude(acme, { role: "Pinned first", score: 3 });
    const last = await jobs.byClaude(acme, { role: "Pinned last", score: 2 });
    await pinAt("17:00:00", first.id);
    await pinAt("18:00:00", last.id);
    const applied = await jobs.add(acme, { role: "Applied" });
    await app.moveJob(HECTOR, { id: applied.id, status: "applied" });
    await jobs.add(
      await jobs.company("Acme Inc", ANOTHER_OWNER),
      { role: "Theirs" },
      { actor: "owner", ownerId: ANOTHER_OWNER },
    );

    expect(await ranked()).toEqual([
      "Pinned last",
      "Pinned first",
      "Hector's pick",
      "High fit",
      "Low fit",
    ]);
  });

  it("weighs a posted band against Hector's pay floor", async () => {
    await jobs.byClaude(acme, { role: "Under the floor", payMax: 90_000 });
    await jobs.byClaude(acme, { role: "No band" });
    await jobs.byClaude(acme, { role: "At the floor", payMin: 100_000 });
    // With no floor, pay weighs nothing, and of equal priorities the higher posted top leads.
    expect((await ranked())[0]).toBe("Under the floor");

    await app.updateSettings(HECTOR, {
      targets: DEFAULT_SETTINGS.targets,
      payFloor: 100_000,
      season: null,
      updatedAt: null,
    });

    expect(await ranked()).toEqual([
      "At the floor",
      "No band",
      "Under the floor",
    ]);
  });

  it("answers the ranked list a page at a time, narrowed to one company", async () => {
    for (const [role, score] of [
      ["A role", 9],
      ["B role", 8],
      ["C role", 7],
    ] as const) {
      await jobs.byClaude(acme, { role, score });
    }
    const globex = await jobs.company("Globex");
    await jobs.byClaude(globex, { role: "Globex role", score: 10 });

    const page = await app.findJobs(
      OWNER,
      query({ status: "to-apply", limit: 2 }),
    );
    expect(page.jobs.map((job) => job.role)).toEqual(["Globex role", "A role"]);
    expect(page.nextOffset).toBe(2);
    expect(await ranked({ limit: 2, offset: 2 })).toEqual(["B role", "C role"]);
    expect(await ranked({ companyId: globex })).toEqual(["Globex role"]);
  });
});
