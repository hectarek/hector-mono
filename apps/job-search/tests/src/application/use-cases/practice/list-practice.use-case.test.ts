import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import { logPracticeSchema } from "@/src/entities/models/practice-entry.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR } from "@/tests/_support/jobs";

describeEachBackend("listPractice", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  afterEach(() => {
    setSystemTime();
  });

  async function aSession(topic: string, practicedOn: string, ownerId = OWNER) {
    const { session } = await app.logPractice(
      { actor: "owner", ownerId },
      logPracticeSchema.parse({ topic, result: "solved", practicedOn }),
    );
    return session;
  }

  async function review(sessionId: string, practicedOn: string) {
    await app.logPractice(
      HECTOR,
      logPracticeSchema.parse({ sessionId, result: "solved", practicedOn }),
    );
  }

  it("lists the reviews due by today, the earliest first, and leaves out what isn't due or is done (R11)", async () => {
    setSystemTime(new Date("2026-10-29T15:00:00Z"));
    await aSession("Due Tuesday", "2026-10-25");
    await aSession("Due last week", "2026-10-20");
    await aSession("Due Saturday", "2026-10-29");
    const done = await aSession("Done", "2026-09-01");
    await review(done.id, "2026-09-03");
    await review(done.id, "2026-09-10");
    await review(done.id, "2026-10-01");
    await aSession("Someone else's", "2026-10-20", ANOTHER_OWNER);

    const { today, due } = await app.listPractice(OWNER, { limit: 20 });

    expect(today).toBe("2026-10-29");
    expect(
      due.map(({ topic, nextReview }) => [topic, nextReview.dueOn]),
    ).toEqual([
      ["Due last week", "2026-10-22"],
      ["Due Tuesday", "2026-10-27"],
    ]);
  });

  // AE4's rule for practice: the day is Eastern, whatever the server's UTC date.
  it("counts a review due tomorrow in Eastern time as not due yet, though the server's date has turned", async () => {
    // 10:30 pm Eastern on Thursday, Oct 29, which is Friday in UTC.
    setSystemTime(new Date("2026-10-30T02:30:00Z"));
    await aSession("Due Friday", "2026-10-28");

    expect((await app.listPractice(OWNER, { limit: 20 })).due).toEqual([]);

    // Half past midnight Eastern on Friday.
    setSystemTime(new Date("2026-10-30T04:30:00Z"));
    expect(
      (await app.listPractice(OWNER, { limit: 20 })).due.map(
        ({ topic }) => topic,
      ),
    ).toEqual(["Due Friday"]);
  });

  it("lists the latest sessions, the newest first, up to the limit", async () => {
    setSystemTime(new Date("2026-10-29T15:00:00Z"));
    await aSession("Oldest", "2026-10-01");
    await aSession("Newest", "2026-10-28");
    await aSession("Middle", "2026-10-15");

    const { recent } = await app.listPractice(OWNER, { limit: 2 });

    expect(recent.map(({ topic }) => topic)).toEqual(["Newest", "Middle"]);
  });
});
