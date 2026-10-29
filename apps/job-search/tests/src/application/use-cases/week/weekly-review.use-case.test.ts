import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import { ConflictError, InputParseError } from "@/src/entities/errors/common";
import { logInteractionSchema } from "@/src/entities/models/interaction.model";
import { addPersonSchema } from "@/src/entities/models/person.model";
import { updateSettingsSchema } from "@/src/entities/models/settings.model";
import { saveWeeklyReviewSchema } from "@/src/entities/models/weekly-review.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR } from "@/tests/_support/jobs";

// Thursday, Oct 29, noon Eastern: this week began Monday, Oct 26.
const THURSDAY = new Date("2026-10-29T16:00:00Z");
const THIS_WEEK = "2026-10-26";
const LAST_WEEK = "2026-10-19";

const TARGETS = {
  messagesSent: 10,
  conversationsHeld: 5,
  applications: 3,
  practiceSessions: 6,
  screensReached: 1,
};

describeEachBackend("the weekly review", () => {
  let app: TestApp;
  let person: string;

  beforeEach(async () => {
    setSystemTime(THURSDAY);
    app = makeApp();
    person = (
      await app.addPerson(
        HECTOR,
        addPersonSchema.parse({ name: "Ada Example" }),
      )
    ).id;
  });

  afterEach(() => {
    setSystemTime();
  });

  const sent = (occurredOn: string) =>
    app.logInteraction(
      HECTOR,
      logInteractionSchema.parse({
        personIds: [person],
        kind: "message-sent",
        occurredOn,
      }),
    );

  const save = (input: Record<string, unknown>, context = HECTOR) =>
    app.saveWeeklyReview(
      context,
      saveWeeklyReviewSchema.parse({ updatedAt: null, ...input }),
    );

  const setTargets = async (targets: typeof TARGETS) => {
    const current = await app.getSettings(OWNER);
    return app.updateSettings(
      HECTOR,
      updateSettingsSchema.parse({
        targets,
        pendingCap: current.pendingCap,
        updatedAt: current.updatedAt?.toISOString() ?? null,
      }),
    );
  };

  it("shows a week with no review: its live counts, today's targets, and the weeks around it", async () => {
    await sent("2026-10-27");

    expect(await app.getWeek(OWNER, {})).toEqual({
      week: THIS_WEEK,
      counts: {
        messagesSent: 1,
        conversationsHeld: 0,
        applications: 0,
        practiceSessions: 0,
        screensReached: 0,
      },
      targets: {
        messagesSent: null,
        conversationsHeld: null,
        applications: null,
        practiceSessions: null,
        screensReached: null,
      },
      review: null,
      previous: LAST_WEEK,
      next: null,
    });
    expect((await app.getWeek(OWNER, { week: LAST_WEEK })).next).toBe(
      THIS_WEEK,
    );
  });

  // R10: the snapshot stays; the live count shows beside it.
  it("fixes the counts and targets at the first save; a late message raises the live count, not the snapshot", async () => {
    await setTargets(TARGETS);
    await sent("2026-10-20");

    const saved = await save({
      week: LAST_WEEK,
      milestone: "Shipped the fictional widget",
      change: "Send messages earlier in the week",
    });
    await sent("2026-10-21");

    expect(saved).toMatchObject({
      week: LAST_WEEK,
      counts: { messagesSent: 1 },
      targets: TARGETS,
      milestone: "Shipped the fictional widget",
      change: "Send messages earlier in the week",
      author: "owner",
    });
    const view = await app.getWeek(OWNER, { week: LAST_WEEK });
    expect(view.review?.counts.messagesSent).toBe(1);
    expect(view.counts.messagesSent).toBe(2);
  });

  it("uses a target changed mid-week for this week, while a saved week keeps its own", async () => {
    await setTargets(TARGETS);
    await save({ week: LAST_WEEK });

    await setTargets({ ...TARGETS, applications: 5 });

    expect((await app.getWeek(OWNER, {})).targets.applications).toBe(5);
    expect(
      (await app.getWeek(OWNER, { week: LAST_WEEK })).review?.targets
        .applications,
    ).toBe(3);
  });

  it("changes only the milestone and the change later, against the updatedAt read, and refuses a stale one", async () => {
    const first = await save({ week: THIS_WEEK, milestone: "Draft" });
    await sent("2026-10-28");

    const second = await save({
      week: THIS_WEEK,
      change: "Fewer tabs open",
      updatedAt: first.updatedAt.toISOString(),
    });

    expect(second).toMatchObject({
      id: first.id,
      counts: first.counts,
      milestone: "Draft",
      change: "Fewer tabs open",
    });
    const refused = await save({
      week: THIS_WEEK,
      milestone: "Late",
      updatedAt: first.updatedAt.toISOString(),
    }).catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(ConflictError);
    expect((refused as ConflictError).current).toEqual(second);
    // A first save that a review already beat to it conflicts too.
    await expect(save({ week: THIS_WEEK })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("saves Claude's review as Claude's, and logs it", async () => {
    const saved = await save(
      { week: LAST_WEEK, milestone: "Claude's summary" },
      CLAUDE,
    );

    expect(saved.author).toBe("agent");
    const [entry] = (
      await app.listActivity(OWNER, {
        record: { kind: "weekly-review", id: saved.id },
        limit: 5,
        offset: 0,
      })
    ).entries;
    expect(entry).toMatchObject({ actor: "agent", action: "created" });
  });

  it("refuses a week that hasn't started", async () => {
    await expect(save({ week: "2026-11-02" })).rejects.toBeInstanceOf(
      InputParseError,
    );
  });

  // KTD2.
  it("keeps another owner's reviews and counts out", async () => {
    const theirs = { actor: "owner", ownerId: ANOTHER_OWNER } as const;
    const them = (
      await app.addPerson(theirs, addPersonSchema.parse({ name: "Other" }))
    ).id;
    await app.logInteraction(
      theirs,
      logInteractionSchema.parse({ personIds: [them], kind: "message-sent" }),
    );
    await save({ week: THIS_WEEK }, theirs);

    const view = await app.getWeek(OWNER, {});

    expect(view.review).toBeNull();
    expect(view.counts.messagesSent).toBe(0);
  });
});
