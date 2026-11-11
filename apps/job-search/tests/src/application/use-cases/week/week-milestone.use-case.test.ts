import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import { ConflictError, InputParseError } from "@/src/entities/errors/common";
import { logInteractionSchema } from "@/src/entities/models/interaction.model";
import { addPersonSchema } from "@/src/entities/models/person.model";
import {
  saveWeeklyReviewSchema,
  setWeekMilestoneSchema,
} from "@/src/entities/models/weekly-review.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR } from "@/tests/_support/jobs";

// Monday, Oct 26, 9 a.m. Eastern: planning, at the start of the week.
const MONDAY = new Date("2026-10-26T13:00:00Z");
const THIS_WEEK = "2026-10-26";
const NEXT_WEEK = "2026-11-02";

// R10 as revised 2026-11-10 (U20): Monday's planning sets the week's milestone on its own record,
// which fixes no counts or targets; the review's first save, at the week's end, still does.
describeEachBackend("the week's milestone", () => {
  let app: TestApp;

  beforeEach(() => {
    setSystemTime(MONDAY);
    app = makeApp();
  });

  afterEach(() => {
    setSystemTime();
  });

  const set = (input: Record<string, unknown>, context = HECTOR) =>
    app.setWeekMilestone(
      context,
      setWeekMilestoneSchema.parse({ updatedAt: null, ...input }),
    );

  it("sets the milestone at planning without fixing the week: the review's first save still does", async () => {
    const plan = await set({
      week: THIS_WEEK,
      milestone: "Ship the fictional portfolio page",
    });
    // Wednesday: a message sent after planning.
    setSystemTime(new Date("2026-10-28T16:00:00Z"));
    const person = (
      await app.addPerson(
        HECTOR,
        addPersonSchema.parse({ name: "Ada Example" }),
      )
    ).id;
    await app.logInteraction(
      HECTOR,
      logInteractionSchema.parse({
        personIds: [person],
        kind: "message-sent",
        occurredOn: "2026-10-28",
      }),
    );

    const week = await app.getWeek(OWNER, {});
    expect(week.plan).toEqual(plan);
    expect(week.plan?.milestone).toBe("Ship the fictional portfolio page");
    expect(week.review).toBeNull();
    // Friday's review fixes the counts as they stand then, the message sent after planning too.
    setSystemTime(new Date("2026-10-30T20:00:00Z"));
    const review = await app.saveWeeklyReview(
      HECTOR,
      saveWeeklyReviewSchema.parse({ week: THIS_WEEK, updatedAt: null }),
    );
    expect(review.counts.messagesSent).toBe(1);
    expect((await app.getWeek(OWNER, {})).plan).toEqual(plan);
  });

  it("changes and clears it against the updatedAt read, and refuses a stale one", async () => {
    const first = await set({ week: THIS_WEEK, milestone: "Draft" });

    const second = await set({
      week: THIS_WEEK,
      milestone: "Ship the fictional widget",
      updatedAt: first.updatedAt.toISOString(),
    });

    expect(second).toMatchObject({
      id: first.id,
      week: THIS_WEEK,
      milestone: "Ship the fictional widget",
    });
    const refused = await set({
      week: THIS_WEEK,
      milestone: "Late",
      updatedAt: first.updatedAt.toISOString(),
    }).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(ConflictError);
    expect((refused as ConflictError).current).toEqual(second);
    // A first milestone that another beat to it conflicts too.
    await expect(
      set({ week: THIS_WEEK, milestone: "Mine" }),
    ).rejects.toBeInstanceOf(ConflictError);

    const cleared = await set({
      week: THIS_WEEK,
      milestone: "  ",
      updatedAt: second.updatedAt.toISOString(),
    });
    expect(cleared.milestone).toBeNull();
    expect((await app.getToday(OWNER)).milestone).toBeNull();
  });

  it("refuses a blank for a week with no plan yet", async () => {
    await expect(
      set({ week: THIS_WEEK, milestone: null }),
    ).rejects.toBeInstanceOf(InputParseError);
    expect((await app.getWeek(OWNER, {})).plan).toBeNull();
  });

  it("plans a week ahead, which Today leaves out until it starts", async () => {
    await set({ week: NEXT_WEEK, milestone: "Five fictional screens" });

    expect((await app.getToday(OWNER)).milestone).toBeNull();
    expect(
      (await app.getWeek(OWNER, { week: NEXT_WEEK })).plan?.milestone,
    ).toBe("Five fictional screens");
  });

  it("logs Claude's milestone as Claude's, and a save that changes nothing not at all", async () => {
    const plan = await set(
      { week: THIS_WEEK, milestone: "Claude's pick" },
      CLAUDE,
    );
    await set(
      {
        week: THIS_WEEK,
        milestone: "Claude's pick",
        updatedAt: plan.updatedAt.toISOString(),
      },
      CLAUDE,
    );

    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "week-plan", id: plan.id },
      limit: 5,
      offset: 0,
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      actor: "agent",
      action: "created",
      changes: [
        { field: "week", before: null, after: THIS_WEEK },
        { field: "milestone", before: null, after: "Claude's pick" },
      ],
    });
    expect((await app.getToday(OWNER)).milestone).toBe("Claude's pick");
  });

  // KTD2.
  it("keeps another owner's milestone out", async () => {
    await set(
      { week: THIS_WEEK, milestone: "Theirs" },
      { actor: "owner", ownerId: ANOTHER_OWNER },
    );

    expect((await app.getWeek(OWNER, {})).plan).toBeNull();
    expect((await app.getToday(OWNER)).milestone).toBeNull();
  });
});
