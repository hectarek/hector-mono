import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import { logInteractionSchema } from "@/src/entities/models/interaction.model";
import { addPersonSchema } from "@/src/entities/models/person.model";
import { logPracticeSchema } from "@/src/entities/models/practice-entry.model";
import { updateSettingsSchema } from "@/src/entities/models/settings.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR, jobFixtures } from "@/tests/_support/jobs";

// 11:30 pm Eastern on Wednesday, Oct 28: already Oct 29 on the server's UTC clock.
const LATE_WEDNESDAY = new Date("2026-10-29T03:30:00Z");

describeEachBackend("getToday", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;
  let companyId: string;

  beforeEach(async () => {
    setSystemTime(LATE_WEDNESDAY);
    app = makeApp();
    jobs = jobFixtures(app);
    companyId = await jobs.company();
  });

  afterEach(() => {
    setSystemTime();
  });

  const person = async (input: Record<string, unknown> = {}) =>
    (
      await app.addPerson(
        HECTOR,
        addPersonSchema.parse({ name: "Ada Example", ...input }),
      )
    ).id;

  const log = (input: Record<string, unknown>) =>
    app.logInteraction(HECTOR, logInteractionSchema.parse(input));

  const practice = async (input: Record<string, unknown>) =>
    (await app.logPractice(HECTOR, logPracticeSchema.parse(input))).session;

  const appliedOn = async (on: string) => {
    const job = await jobs.add(companyId, { role: `Applied ${on}` });
    await app.moveJob(HECTOR, { id: job.id, status: "applied", on });
    return job.id;
  };

  it("lists the week as Eastern time has it: today's next date is due, an earlier one overdue, tomorrow's not yet", async () => {
    const today = await jobs.add(companyId, {
      role: "Due today",
      nextStep: "Call back",
      nextDate: "2026-10-28",
    });
    const overdue = await jobs.add(companyId, {
      role: "Overdue",
      nextStep: "Send the form",
      nextDate: "2026-10-27",
    });
    await jobs.add(companyId, {
      role: "Tomorrow",
      nextStep: "Prepare",
      nextDate: "2026-10-29",
    });
    const dueNow = await person({
      name: "Due Example",
      nextStep: "Follow up",
      nextDate: "2026-10-28",
    });
    await person({
      name: "Later Example",
      nextStep: "Follow up",
      nextDate: "2026-10-29",
    });

    const view = await app.getToday(OWNER);

    expect(view.today).toBe("2026-10-28");
    expect(view.monday).toBe("2026-10-26");
    expect(view.due.jobs.map(({ id }) => id)).toEqual([overdue.id, today.id]);
    expect(view.due.people.map(({ id }) => id)).toEqual([dueNow]);
  });

  it("lists a job applied 21 days ago with no reply once, as a stale candidate, and keeps one with a reply as due", async () => {
    const stale = await appliedOn("2026-10-01");
    const replied = await appliedOn("2026-10-02");
    const contact = await person();
    await log({
      personIds: [contact],
      kind: "reply-received",
      occurredOn: "2026-10-20",
      jobId: replied,
    });

    const { due } = await app.getToday(OWNER);

    expect(due.stale.map(({ id }) => id)).toEqual([stale]);
    expect(due.jobs.map(({ id }) => id)).toEqual([replied]);
  });

  it("puts Claude's proposals and the conversations that have ended under decisions", async () => {
    const proposal = await jobs.propose(companyId);
    const contact = await person({ name: "Grace Example" });
    const ended = await log({
      personIds: [contact],
      kind: "conversation",
      scheduled: {
        startsAt: "2026-10-28T14:00:00-04:00",
        endsAt: "2026-10-28T14:30:00-04:00",
      },
    });
    await log({
      personIds: [contact],
      kind: "conversation",
      scheduled: {
        startsAt: "2026-10-28T23:00:00-04:00",
        endsAt: "2026-10-28T23:59:00-04:00",
      },
    });

    const { decisions } = await app.getToday(OWNER);

    expect(decisions.proposals.map(({ id }) => id)).toEqual([proposal.id]);
    expect(decisions.debriefs).toEqual(
      ended.interactions.map((conversation) => ({
        conversation,
        person: {
          id: contact,
          name: "Grace Example",
          role: null,
          rank: null,
        },
      })),
    );
  });

  it("counts the week Monday to Sunday by the days things happened, each by its definition (R10)", async () => {
    const contact = await person();
    for (const occurredOn of ["2026-10-25", "2026-10-26", "2026-10-27"]) {
      await log({ personIds: [contact], kind: "message-sent", occurredOn });
    }
    await log({
      personIds: [contact],
      kind: "conversation",
      occurredOn: "2026-10-27",
    });
    const [cancelled] = (
      await log({
        personIds: [contact],
        kind: "conversation",
        scheduled: {
          startsAt: "2026-10-27T10:00:00-04:00",
          endsAt: "2026-10-27T10:30:00-04:00",
        },
      })
    ).interactions;
    await log({ conversationId: cancelled?.id, outcome: "cancelled" });
    await appliedOn("2026-10-25");
    await appliedOn("2026-10-27");
    const screened = await jobs.add(companyId, { role: "Screened" });
    await app.moveJob(HECTOR, {
      id: screened.id,
      status: "screen",
      on: "2026-10-28",
    });
    await app.moveJob(HECTOR, {
      id: screened.id,
      status: "onsite",
      on: "2026-10-28",
    });
    await practice({
      topic: "Last week",
      result: "solved",
      practicedOn: "2026-10-25",
    });
    const reviewed = await practice({
      topic: "Pair sum",
      result: "solved",
      practicedOn: "2026-10-26",
    });
    await practice({
      sessionId: reviewed.id,
      result: "solved",
      practicedOn: "2026-10-28",
    });

    const { counts } = await app.getToday(OWNER);

    expect(counts).toEqual({
      messagesSent: 2,
      conversationsHeld: 1,
      // The job moved straight to screen gets its applied-on that day too (R3).
      applications: 2,
      practiceSessions: 1,
      screensReached: 2,
    });
  });

  it("lists the practice reviews due by today, the earliest first", async () => {
    const overdue = await practice({
      topic: "Interval merge",
      result: "solved",
      practicedOn: "2026-10-25",
    });
    const dueToday = await practice({
      topic: "Pair sum",
      result: "failed",
      practicedOn: "2026-10-26",
    });
    await practice({
      topic: "Tree depth",
      result: "solved",
      practicedOn: "2026-10-27",
    });

    const { due } = await app.getToday(OWNER);

    expect(
      due.practice.map(({ id, nextReview }) => [id, nextReview.dueOn]),
    ).toEqual([
      [overdue.id, "2026-10-27"],
      [dueToday.id, "2026-10-28"],
    ]);
  });

  it("groups Claude's changes into its sessions, newest first, with refused attempts listed", async () => {
    const first = await app.startSession(CLAUDE, { limit: 20 });
    await jobs.propose(companyId);
    const second = await app.startSession(CLAUDE, { limit: 20 });
    const proposal = await jobs.propose(companyId);
    await app
      .reviewProposal(CLAUDE, {
        id: proposal.id,
        updatedAt: proposal.updatedAt,
        decision: "accept",
      })
      .catch(() => {});

    const { claude } = await app.getToday(OWNER);

    expect(claude.map(({ id }) => id)).toEqual([
      second.session.id,
      first.session.id,
    ]);
    expect(claude[0]?.counts).toEqual([{ kind: "job", changes: 2 }]);
    expect(claude[0]?.listed).toMatchObject([
      { action: "refused", reason: "accept", record: { kind: "job" } },
    ]);
    expect(claude[1]?.counts).toEqual([
      { kind: "lead-source", changes: 1 },
      { kind: "job", changes: 1 },
    ]);
  });

  // KTD2.
  it("keeps another owner's rows out of every section and count", async () => {
    const theirs = { actor: "owner", ownerId: ANOTHER_OWNER } as const;
    const theirCompany = await jobs.company("Initech", ANOTHER_OWNER);
    const theirJob = await jobs.add(
      theirCompany,
      { nextStep: "Call", nextDate: "2026-10-27" },
      theirs,
    );
    await app.moveJob(theirs, {
      id: theirJob.id,
      status: "screen",
      on: "2026-10-27",
    });
    await jobs.propose(theirCompany, {}, { ...theirs, actor: "agent" });
    const them = (
      await app.addPerson(
        theirs,
        addPersonSchema.parse({
          name: "Other Example",
          nextDate: "2026-10-27",
        }),
      )
    ).id;
    await app.logInteraction(
      theirs,
      logInteractionSchema.parse({ personIds: [them], kind: "message-sent" }),
    );
    await app.logPractice(
      theirs,
      logPracticeSchema.parse({
        topic: "Theirs",
        result: "solved",
        practicedOn: "2026-10-26",
      }),
    );

    const view = await app.getToday(OWNER);

    expect(view.decisions).toEqual({ proposals: [], debriefs: [] });
    expect(view.due).toEqual({ jobs: [], people: [], stale: [], practice: [] });
    expect(view.claude).toEqual([]);
    expect(view.counts).toEqual({
      messagesSent: 0,
      conversationsHeld: 0,
      applications: 0,
      practiceSessions: 0,
      screensReached: 0,
    });
  });

  it("shows Hector's targets beside the counts, none until he sets them", async () => {
    expect((await app.getToday(OWNER)).targets.applications).toBeNull();

    await app.updateSettings(
      HECTOR,
      updateSettingsSchema.parse({
        targets: {
          messagesSent: 10,
          conversationsHeld: 5,
          applications: 3,
          practiceSessions: 6,
          screensReached: 1,
        },
        pendingCap: 10,
        updatedAt: null,
      }),
    );

    expect((await app.getToday(OWNER)).targets).toEqual({
      messagesSent: 10,
      conversationsHeld: 5,
      applications: 3,
      practiceSessions: 6,
      screensReached: 1,
    });
  });
});
