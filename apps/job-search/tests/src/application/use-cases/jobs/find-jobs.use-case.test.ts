import { beforeEach, expect, it } from "bun:test";
import type { JobQuery } from "@/src/entities/models/job.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR, jobFixtures } from "@/tests/_support/jobs";

const query = (narrower: Partial<JobQuery> = {}): JobQuery => ({
  reviewState: "accepted",
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

  it("lists accepted jobs by next date, then role, as a list shows them", async () => {
    await jobs.add(acme, { role: "Gadget designer" });
    await jobs.add(acme, { role: "Widget engineer", nextDate: "2026-11-02" });
    await jobs.add(acme, { role: "Anvil tester", nextDate: "2026-10-30" });
    await jobs.add(acme, { role: "Bolt fitter" });
    await jobs.propose(acme, { role: "A proposal" });

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
      reviewState: "accepted",
      dismissReason: null,
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
    expect(await roles({ status: "open" })).toEqual([
      "Globex role",
      "Open role",
    ]);
    expect(await roles({ status: "target" })).toEqual(["Open role"]);
    expect(await roles({ companyId: globex })).toEqual(["Globex role"]);
  });

  // The UX plan's UX6: the steps with no date, which This week never shows as due.
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
