import { expect, it } from "bun:test";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

// A fictional sheet frozen on Saturday 2026-10-24, its records in the week of Monday 2026-10-19.
const WEEK = "2026-10-19";
const NEXT_WEEK = "2026-10-26";

const snapshot = () => ({
  takenOn: "2026-10-24",
  companies: [
    { ref: "c1", name: "Widget Works" },
    { ref: "c2", name: "Gizmo Labs", tier: 2 },
  ],
  jobs: [
    {
      ref: "j1",
      companyRef: "c1",
      role: "Widget engineer",
      status: "applied",
      appliedOn: "2026-10-20",
      nextStep: "Ask about the team",
      nextDate: "2026-10-29",
      postingUrl: "https://example.com/jobs/12345",
      source: "Widget Jobs",
    },
    {
      ref: "j2",
      companyRef: "c2",
      role: "Gizmo engineer",
      status: "screen",
      appliedOn: "2026-10-01",
      statusOn: "2026-10-22",
      source: "unknown",
    },
    {
      ref: "j3",
      companyRef: "c1",
      role: "Widget lead",
      status: "target",
      source: "Referral",
    },
  ],
  people: [
    {
      ref: "p1",
      name: "Pat Example",
      companyRef: "c1",
      jobRefs: ["j1"],
      messagedOn: "2026-10-20",
      repliedOn: "2026-10-21",
      metOn: "2026-10-23",
    },
    { ref: "p2", name: "Sam Example", messagedOn: "2026-10-22" },
  ],
  practice: [
    {
      ref: "s1",
      topic: "Two pointers",
      type: "Coding",
      practicedOn: "2026-10-21",
      result: "solved",
      minutes: 30,
      reviews: [{ ref: "r1", practicedOn: "2026-10-23", result: "partial" }],
    },
  ],
});

const ALL_REFS = {
  company: ["c1", "c2"],
  job: ["j1", "j2", "j3"],
  person: ["p1", "p2"],
  practice: ["s1"],
};

const NONE = { company: [], job: [], person: [], practice: [] };

const idOf = async (app: TestApp, key: string): Promise<string> => {
  const record = (await app.repos.importRefs.list(OWNER)).get(key);
  if (!record) throw new Error(`Nothing was imported under ${key}`);
  return record.id;
};

describeEachBackend("the sheet's import", () => {
  it("dry-runs: reports what a commit would create, and writes nothing", async () => {
    const app = makeApp();

    const report = await app.importSnapshot(OWNER, snapshot(), {
      commit: false,
    });

    expect(report).toEqual({
      commit: false,
      created: ALL_REFS,
      skipped: NONE,
      problems: [],
      undated: [],
      refused: null,
    });
    expect((await app.repos.importRefs.list(OWNER)).size).toBe(0);
    expect(
      (await app.findCompanies(OWNER, { limit: 50, offset: 0 })).companies,
    ).toEqual([]);
  });

  it("skips, on a second commit, every record the first one wrote", async () => {
    const app = makeApp();
    await app.importSnapshot(OWNER, snapshot(), { commit: true });

    const again = await app.importSnapshot(OWNER, snapshot(), {
      commit: true,
    });

    expect(again.created).toEqual(NONE);
    expect(again.skipped).toEqual(ALL_REFS);
  });

  it("reports a record it can't read, and imports the rest", async () => {
    const app = makeApp();
    const withUnknown = snapshot();
    withUnknown.jobs.push({
      ref: "j4",
      companyRef: "c1",
      role: "Widget tester",
      status: "interviewing",
      source: "Widget Jobs",
    });

    const report = await app.importSnapshot(OWNER, withUnknown, {
      commit: true,
    });

    expect(report.problems).toEqual([
      { kind: "job", ref: "j4", reason: expect.any(String) },
    ]);
    expect(report.created).toEqual(ALL_REFS);
  });

  it("keeps each job's applied-on and its dated moves, as the import's", async () => {
    const app = makeApp();
    await app.importSnapshot(OWNER, snapshot(), { commit: true });
    const screened = await idOf(app, "job:j2");

    expect(await app.repos.jobs.get(OWNER, screened)).toMatchObject({
      status: "screen",
      appliedOn: "2026-10-01",
      reviewState: "accepted",
    });
    expect(
      (await app.repos.jobs.listStatusChanges(OWNER, screened)).map(
        ({ from, to, on, actor }) => ({ from, to, on, actor }),
      ),
    ).toEqual([
      { from: "applied", to: "screen", on: "2026-10-22", actor: "import" },
      { from: "verify", to: "applied", on: "2026-10-01", actor: "import" },
    ]);
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "job", id: screened },
      limit: 20,
      offset: 0,
    });
    expect(entries.map(({ actor, action }) => ({ actor, action }))).toEqual([
      { actor: "import", action: "created" },
    ]);
  });

  it("keeps an applied job's next step and date, not the follow-up a move would set", async () => {
    const app = makeApp();
    await app.importSnapshot(OWNER, snapshot(), { commit: true });

    expect(
      await app.repos.jobs.get(OWNER, await idOf(app, "job:j1")),
    ).toMatchObject({
      status: "applied",
      appliedOn: "2026-10-20",
      nextStep: "Ask about the team",
      nextDate: "2026-10-29",
    });
  });

  it("lists a job past applied with no status date in a dry run, and won't start a commit", async () => {
    const app = makeApp();
    const undated = snapshot();
    undated.jobs.push({
      ref: "j5",
      companyRef: "c2",
      role: "Gizmo lead",
      status: "onsite",
      source: "Referral",
    });

    expect(
      (await app.importSnapshot(OWNER, undated, { commit: false })).undated,
    ).toEqual(["j5"]);
    const commit = await app.importSnapshot(OWNER, undated, { commit: true });

    expect(commit.refused).toEqual(expect.any(String));
    expect(commit.created).toEqual(NONE);
    expect((await app.repos.importRefs.list(OWNER)).size).toBe(0);
  });

  it("turns contacts into people linked to their jobs, with one dated interaction per date", async () => {
    const app = makeApp();
    await app.importSnapshot(OWNER, snapshot(), { commit: true });
    const pat = await idOf(app, "person:p1");

    expect(
      (await app.repos.people.listForJob(OWNER, await idOf(app, "job:j1"))).map(
        ({ id }) => id,
      ),
    ).toEqual([pat]);
    expect(
      (await app.repos.interactions.listForPerson(OWNER, pat))
        .map(({ kind, occurredOn, state, author }) => ({
          kind,
          occurredOn,
          state,
          author,
        }))
        .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn)),
    ).toEqual([
      {
        kind: "message-sent",
        occurredOn: "2026-10-20",
        state: null,
        author: "import",
      },
      {
        kind: "reply-received",
        occurredOn: "2026-10-21",
        state: null,
        author: "import",
      },
      {
        kind: "conversation",
        occurredOn: "2026-10-23",
        state: "held",
        author: "import",
      },
    ]);
  });

  it("counts the cutover week as the snapshot's own dates do, and the screen in its own week", async () => {
    const app = makeApp();
    await app.importSnapshot(OWNER, snapshot(), { commit: true });

    expect((await app.getWeek(OWNER, { week: WEEK })).counts).toEqual({
      messagesSent: 2,
      conversationsHeld: 1,
      applications: 1,
      practiceSessions: 1,
      screensReached: 1,
    });
    expect(
      (await app.getWeek(OWNER, { week: NEXT_WEEK })).counts.screensReached,
    ).toBe(0);
  });
});
