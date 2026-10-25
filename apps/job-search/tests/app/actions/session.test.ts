import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { startSession, whoami } from "@/app/actions/session";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TOOL_SET_VERSION } from "@/src/entities/models/agent-session.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

// Every session start in the test container's log, newest first. The log lives for the whole
// run, so tests compare counts or look for their own session.
const sessionStarts = async () =>
  (
    await getInjection("IListActivityController")(
      { record: { kind: "agent-session" }, limit: 50 },
      HECTOR,
    )
  ).entries;

describe("whoami", () => {
  afterEach(() => {
    setSystemTime();
  });

  it("answers who the session acts as, today's date in Eastern time and the tool set's version", async () => {
    // 10:30 pm in New York, when the date in UTC is already the next day's.
    setSystemTime(new Date("2026-09-23T02:30:00Z"));
    for (const actor of ["agent", "owner"] as const) {
      signInAs(actor);
      expect(await whoami({})).toEqual({
        ok: true,
        data: {
          actor,
          today: "2026-09-22",
          toolSetVersion: TOOL_SET_VERSION,
        },
        asOf: expect.any(String),
      });
    }
  });

  it("answers a session the app can't act for with its code", async () => {
    signInAs("stranger");
    expect(await whoami({})).toMatchObject({ ok: false, code: "not-allowed" });
    signInAs("signed-out");
    expect(await whoami({})).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });
});

describe("startSession", () => {
  beforeEach(() => {
    nextState.revalidated = [];
  });

  it("logs Claude's session start with the page tool's name, and refreshes Claude's page", async () => {
    signInAs("agent");
    const result = await startSession({}, "start_session");
    if (!result.ok) throw new Error(`start_session failed: ${result.code}`);

    const [latest] = await sessionStarts();
    expect(latest).toMatchObject({
      actor: "agent",
      tool: "start_session",
      record: { kind: "agent-session", id: result.data.session.id },
      action: "created",
    });
    expect(nextState.revalidated).toEqual(["/agent"]);
  });

  it("refuses a tool name that isn't a page tool's with `validation`, and logs nothing", async () => {
    signInAs("agent");
    const before = (await sessionStarts()).length;

    expect(await startSession({}, "Start Session")).toEqual({
      ok: false,
      code: "validation",
      message: "A page tool's name is snake_case",
    });
    expect(await startSession({}, "a_tool_name_longer_than_thirty_x")).toEqual({
      ok: false,
      code: "validation",
      message: "A page tool's name is at most 30 characters",
    });
    expect((await sessionStarts()).length).toBe(before);
    expect(nextState.revalidated).toEqual([]);
  });

  it("answers input it can't read with `validation`, naming the field", async () => {
    signInAs("agent");
    expect(await startSession({ limit: 0 }, "start_session")).toEqual({
      ok: false,
      code: "validation",
      message: "Limit: Too small: expected number to be >=1",
      fields: { limit: "Too small: expected number to be >=1" },
    });
  });

  it("answers a session the app can't act for with its code, and logs nothing", async () => {
    const before = (await sessionStarts()).length;
    signInAs("stranger");
    expect(await startSession({}, "start_session")).toMatchObject({
      ok: false,
      code: "not-allowed",
    });
    signInAs("signed-out");
    expect(await startSession({}, "start_session")).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
    expect((await sessionStarts()).length).toBe(before);
  });
});
