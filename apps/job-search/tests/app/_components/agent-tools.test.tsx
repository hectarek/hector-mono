import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { AgentTools } from "@/app/_components/agent-tools";
import { ActorChrome } from "@/app/_components/session-chrome";
import { AGENT_TOOLS } from "@/app/_lib/agent-tools/registry";
import { getInjection } from "@/di/container";
import { TOOL_SET_VERSION } from "@/src/entities/models/agent-session.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import {
  FakeModelContext,
  setModelContext,
} from "@/tests/_support/model-context";
import { signInAs } from "@/tests/_support/session";

// Claude's browser: flag-enabled Chrome, as the fake behaves.
let browser: FakeModelContext;
let restore: () => void;
beforeEach(() => {
  browser = new FakeModelContext();
  restore = setModelContext(browser);
});
afterEach(() => {
  restore();
});

// What the session chrome renders for whoever is signed in, mounted in the browser: the server
// decides who gets the registrar (docs/build-plan.md KTD5).
const mountChromeFor = async (account: "agent" | "owner") => {
  signInAs(account);
  return render(await ActorChrome());
};

const names = AGENT_TOOLS.map(({ name }) => name);

describe("Claude's page tools", () => {
  it("registers exactly the registry's tools, with their annotations, for Claude's session", async () => {
    await mountChromeFor("agent");

    expect(await browser.getTools()).toEqual(
      AGENT_TOOLS.map(({ name, description, inputSchema, annotations }) => ({
        name,
        description,
        inputSchema,
        annotations: {
          readOnlyHint: false,
          untrustedContentHint: false,
          consequentialHint: false,
          debugging: false,
          ...annotations,
        },
      })),
    );
  });

  it("registers nothing for Hector's session", async () => {
    await mountChromeFor("owner");
    expect(browser.registrations).toEqual([]);
  });

  it("registers nothing, and doesn't fail, in a browser without page tools", () => {
    restore();
    restore = setModelContext(undefined);
    expect(() => render(<AgentTools />)).not.toThrow();
    expect(browser.registrations).toEqual([]);
  });

  it("takes its tools away when it unmounts, and leaves one registration of each after StrictMode mounts it twice", async () => {
    signInAs("agent");
    const view = render(
      <StrictMode>
        <AgentTools />
      </StrictMode>,
    );

    // Mounted, unmounted and mounted again: the first registrations' signals are aborted.
    expect(
      browser.registrations.map(({ name, signal }) => [name, signal?.aborted]),
    ).toEqual([
      ...names.map((name) => [name, true]),
      ...names.map((name) => [name, false]),
    ]);
    expect((await browser.getTools()).map(({ name }) => name)).toEqual(names);
    expect(await browser.call("whoami")).toMatchObject({ ok: true });

    view.unmount();
    expect(browser.registrations.every(({ signal }) => signal?.aborted)).toBe(
      true,
    );
    expect(await browser.getTools()).toEqual([]);
  });

  it("answers a call with its action's envelope as the action gave it", async () => {
    signInAs("agent");
    render(<AgentTools />);

    expect(await browser.call("whoami")).toEqual({
      ok: true,
      data: {
        actor: "agent",
        today: todayIn(PLAN_TIME_ZONE),
        toolSetVersion: TOOL_SET_VERSION,
      },
      asOf: expect.any(String),
    });

    const started = await browser.call("start_session", { limit: 5 });
    // The session it started is the latest in the log, as Claude's, under the tool's name.
    const [logged] = (
      await getInjection("IListActivityController")(
        { record: { kind: "agent-session" } },
        { actor: "owner", ownerId: TEST_ACCOUNTS.owner.user.id },
      )
    ).entries;
    expect(logged).toMatchObject({ actor: "agent", tool: "start_session" });
    expect(started).toMatchObject({
      ok: true,
      data: {
        session: { id: logged?.record.id, startedAt: expect.any(String) },
        changes: expect.any(Array),
      },
      asOf: expect.any(String),
    });
  });

  it("answers input it can't read with `validation`, naming the field", async () => {
    signInAs("agent");
    render(<AgentTools />);

    expect(await browser.call("start_session", { limit: "all" })).toEqual({
      ok: false,
      code: "validation",
      message: expect.stringMatching(/^Limit: /),
      fields: { limit: expect.any(String) },
    });
  });
});
