import { beforeEach, describe, expect, it } from "bun:test";
import {
  deletePracticeEntry,
  listPractice,
  logPractice,
} from "@/app/actions/practice";
import { nextState } from "@/tests/_support/next";
import { dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

// The test container keeps every session for the whole run, so each test names its own.
const aTopic = () => `Pair sum ${crypto.randomUUID().slice(0, 8)}`;

beforeEach(() => {
  nextState.revalidated = [];
});

describe("the practice log", () => {
  it("takes Claude's session through the tool, and refreshes the practice pages and Claude's page", async () => {
    signInAs("agent");

    const { session } = dataOf(
      await logPractice({ topic: aTopic(), result: "solved" }, "log_practice"),
    );

    expect(session.author).toBe("agent");
    expect(nextState.revalidated).toEqual([
      "/practice",
      `/practice/${session.id}`,
      "/agent",
    ]);
  });

  it("answers `validation`, naming the field, for a review that names a topic", async () => {
    signInAs("owner");
    const { session } = dataOf(
      await logPractice({ topic: aTopic(), result: "solved" }),
    );

    expect(
      await logPractice({
        sessionId: session.id,
        topic: "Another problem",
        result: "solved",
      }),
    ).toMatchObject({
      ok: false,
      code: "validation",
      fields: { topic: expect.any(String) },
    });
  });

  it("lists the session among the latest for list_practice", async () => {
    signInAs("agent");
    const topic = aTopic();
    dataOf(await logPractice({ topic, result: "partial" }));

    const { recent } = dataOf(await listPractice({}));

    expect(recent.map((session) => session.topic)).toContain(topic);
  });

  // R21: deleting is Hector's alone.
  it("refuses Claude's delete with `human-only`, and takes Hector's", async () => {
    signInAs("owner");
    const { session } = dataOf(
      await logPractice({ topic: aTopic(), result: "solved" }),
    );
    signInAs("agent");

    expect(await deletePracticeEntry({ id: session.id })).toMatchObject({
      ok: false,
      code: "human-only",
    });

    signInAs("owner");
    expect(await deletePracticeEntry({ id: session.id })).toMatchObject({
      ok: true,
      data: { id: session.id, kind: "session" },
    });
  });
});
