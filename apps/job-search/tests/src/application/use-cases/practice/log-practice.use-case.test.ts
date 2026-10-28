import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  logPracticeSchema,
  type PracticeSession,
} from "@/src/entities/models/practice-entry.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR } from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "log_practice",
};

const practice = (input: Record<string, unknown>) =>
  logPracticeSchema.parse(input);

describeEachBackend("logPractice", () => {
  let app: TestApp;

  // A Thursday, 11 am Eastern.
  beforeEach(() => {
    setSystemTime(new Date("2026-10-29T15:00:00Z"));
    app = makeApp();
  });

  afterEach(() => {
    setSystemTime();
  });

  // A session, solved on the day given.
  async function aSession(
    practicedOn: string,
    context: ChangeContext = HECTOR,
  ): Promise<PracticeSession> {
    const { session } = await app.logPractice(
      context,
      practice({ topic: "Pair sum", result: "solved", practicedOn }),
    );
    return session;
  }

  async function review(
    sessionId: string,
    practicedOn: string,
    result = "solved",
  ): Promise<PracticeSession> {
    const { session } = await app.logPractice(
      HECTOR,
      practice({ sessionId, result, practicedOn }),
    );
    return session;
  }

  it("logs a session dated today, with its first review 2 days later and its history (R11, R19)", async () => {
    const { session } = await app.logPractice(
      CLAUDE,
      practice({
        topic: "Pair sum",
        type: "Coding",
        pattern: "Two pointers",
        result: "partial",
        aiUsed: true,
        minutes: 25,
      }),
    );

    expect(session).toMatchObject({
      topic: "Pair sum",
      type: "Coding",
      pattern: "Two pointers",
      practicedOn: "2026-10-29",
      result: "partial",
      aiUsed: true,
      minutes: 25,
      author: "agent",
      reviews: [],
      nextReview: { step: 1, dueOn: "2026-10-31" },
    });
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "practice-entry", id: session.id },
      limit: 20,
      offset: 0,
    });
    expect(entries).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "log_practice",
        action: "created",
      }),
    ]);
  });

  it("logs reviews up the ladder: 2 days, then 7, then 21, then done", async () => {
    const { id } = await aSession("2026-10-01");

    expect((await review(id, "2026-10-03")).nextReview).toEqual({
      step: 2,
      dueOn: "2026-10-10",
    });
    expect((await review(id, "2026-10-10")).nextReview).toEqual({
      step: 3,
      dueOn: "2026-10-31",
    });
    const done = await review(id, "2026-10-29");
    expect(done.nextReview).toBeNull();
    expect(done.reviews.map(({ practicedOn }) => practicedOn)).toEqual([
      "2026-10-03",
      "2026-10-10",
      "2026-10-29",
    ]);
  });

  it("retries a failed or partial review 2 days later at the same step", async () => {
    const { id } = await aSession("2026-10-20");

    expect((await review(id, "2026-10-22", "failed")).nextReview).toEqual({
      step: 1,
      dueOn: "2026-10-24",
    });
    expect((await review(id, "2026-10-24", "partial")).nextReview).toEqual({
      step: 1,
      dueOn: "2026-10-26",
    });
  });

  it("records a review's step and session in its history", async () => {
    const { id } = await aSession("2026-10-20");
    const { reviews } = await review(id, "2026-10-22");

    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "practice-entry", id: reviews[0]?.id ?? "" },
      limit: 20,
      offset: 0,
    });
    expect(entries[0]?.changes).toEqual(
      expect.arrayContaining([
        { field: "session", before: null, after: "Pair sum" },
        { field: "step", before: null, after: 1 },
      ]),
    );
  });

  it("refuses a review once the third is solved", async () => {
    const { id } = await aSession("2026-10-01");
    await review(id, "2026-10-03");
    await review(id, "2026-10-10");
    await review(id, "2026-10-29");

    await expect(review(id, "2026-10-29")).rejects.toThrow(InputParseError);
  });

  it("refuses practice dated after today, and a review dated before the try it follows", async () => {
    await expect(
      app.logPractice(
        HECTOR,
        practice({
          topic: "Pair sum",
          result: "solved",
          practicedOn: "2026-10-30",
        }),
      ),
    ).rejects.toThrow(InputParseError);

    const { id } = await aSession("2026-10-20");
    await review(id, "2026-10-22");
    await expect(review(id, "2026-10-21")).rejects.toThrow(InputParseError);
  });

  // KTD2: every query takes the owner's id.
  it("answers not-found for a review of another owner's session", async () => {
    const theirs = await aSession("2026-10-20", {
      actor: "owner",
      ownerId: ANOTHER_OWNER,
    });

    await expect(review(theirs.id, "2026-10-22")).rejects.toThrow(
      NotFoundError,
    );
    await expect(
      app.getPracticeSession(OWNER, { id: theirs.id }),
    ).rejects.toThrow(NotFoundError);
  });
});

it("asks a session for its problem or topic, and a review to leave the session's facts out", () => {
  expect(
    logPracticeSchema.safeParse({ result: "solved" }).error?.issues,
  ).toEqual([expect.objectContaining({ path: ["topic"] })]);
  expect(
    logPracticeSchema.safeParse({
      sessionId: crypto.randomUUID(),
      topic: "Pair sum",
      result: "solved",
    }).error?.issues,
  ).toEqual([expect.objectContaining({ path: ["topic"] })]);
});
