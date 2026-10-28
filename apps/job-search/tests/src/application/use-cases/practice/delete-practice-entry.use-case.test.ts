import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import { HumanOnlyError, NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { logPracticeSchema } from "@/src/entities/models/practice-entry.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR } from "@/tests/_support/jobs";

const CLAUDE: ChangeContext = { actor: "agent", ownerId: OWNER };

describeEachBackend("deletePracticeEntry", () => {
  let app: TestApp;

  beforeEach(() => {
    setSystemTime(new Date("2026-10-29T15:00:00Z"));
    app = makeApp();
  });

  afterEach(() => {
    setSystemTime();
  });

  // A session on Oct 20 with a solved review on Oct 22.
  async function aReviewedSession() {
    const { session } = await app.logPractice(
      HECTOR,
      logPracticeSchema.parse({
        topic: "Pair sum",
        result: "solved",
        practicedOn: "2026-10-20",
      }),
    );
    const reviewed = await app.logPractice(
      HECTOR,
      logPracticeSchema.parse({
        sessionId: session.id,
        result: "solved",
        practicedOn: "2026-10-22",
      }),
    );
    const [review] = reviewed.session.reviews;
    if (!review) {
      throw new Error("Expected the review");
    }
    return { sessionId: session.id, reviewId: review.id };
  }

  // R21: deleting is Hector's alone, and the refusal stays in the log.
  it("refuses Claude's delete and logs the refusal", async () => {
    const { sessionId } = await aReviewedSession();

    await expect(
      app.deletePracticeEntry(CLAUDE, { id: sessionId }),
    ).rejects.toThrow(HumanOnlyError);
    const { entries } = await app.listActivity(OWNER, {
      record: { kind: "practice-entry", id: sessionId },
      limit: 20,
      offset: 0,
    });
    expect(entries[0]).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "delete",
    });
    expect(
      (await app.getPracticeSession(OWNER, { id: sessionId })).reviews,
    ).toHaveLength(1);
  });

  it("takes a deleted review's step with it: the session waits on that review again (R11)", async () => {
    const { sessionId, reviewId } = await aReviewedSession();

    expect(await app.deletePracticeEntry(HECTOR, { id: reviewId })).toEqual({
      id: reviewId,
      kind: "review",
      sessionId,
    });

    expect(
      (await app.getPracticeSession(OWNER, { id: sessionId })).nextReview,
    ).toEqual({ step: 1, dueOn: "2026-10-22" });
  });

  it("takes a session's reviews with it", async () => {
    const { sessionId, reviewId } = await aReviewedSession();

    await app.deletePracticeEntry(HECTOR, { id: sessionId });

    await expect(
      app.getPracticeSession(OWNER, { id: sessionId }),
    ).rejects.toThrow(NotFoundError);
    await expect(
      app.deletePracticeEntry(HECTOR, { id: reviewId }),
    ).rejects.toThrow(NotFoundError);
    expect((await app.listPractice(OWNER, { limit: 20 })).recent).toEqual([]);
  });
});
