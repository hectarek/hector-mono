import { describe, expect, it, mock } from "bun:test";
import {
  getActionActor,
  getPageActor,
  withTokenActor,
} from "@/app/_lib/current-actor";
import {
  NotAllowedError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { Redirected } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const OWNER_ID = TEST_ACCOUNTS.owner.user.id;

// What a page or action does after asking who's acting: read its data.
async function readsAfter(helper: () => Promise<unknown>) {
  const query = mock(async () => {});
  let outcome: unknown;
  try {
    await helper();
    await query();
  } catch (err) {
    outcome = err;
  }
  return { outcome, queried: query.mock.calls.length > 0 };
}

describe("getPageActor", () => {
  it("lets Hector's session in as the owner, on its own rows", async () => {
    signInAs("owner");
    expect(await getPageActor()).toEqual({ actor: "owner", ownerId: OWNER_ID });
  });

  it("lets Claude's session in as the agent, on Hector's rows", async () => {
    signInAs("agent");
    expect(await getPageActor()).toEqual({ actor: "agent", ownerId: OWNER_ID });
  });

  it("sends any other account to the private screen before the page reads anything", async () => {
    signInAs("stranger");
    const { outcome, queried } = await readsAfter(getPageActor);
    expect(outcome).toBeInstanceOf(Redirected);
    expect((outcome as Redirected).url).toBe("/private");
    expect(queried).toBe(false);
  });
});

describe("getActionActor", () => {
  it("gives an action who's acting, as pages get it", async () => {
    signInAs("agent");
    expect(await getActionActor()).toEqual({
      actor: "agent",
      ownerId: OWNER_ID,
    });
  });

  // The action turns NotAllowedError into `not-allowed` (docs/build-plan.md KTD4).
  it("refuses any other account with NotAllowedError, never a redirect, before a query runs", async () => {
    signInAs("stranger");
    const { outcome, queried } = await readsAfter(getActionActor);
    expect(outcome).toBeInstanceOf(NotAllowedError);
    expect(queried).toBe(false);
  });

  it("answers a signed-out call with UnauthenticatedError, never a redirect", async () => {
    signInAs("signed-out");
    const { outcome, queried } = await readsAfter(getActionActor);
    expect(outcome).toBeInstanceOf(UnauthenticatedError);
    expect(queried).toBe(false);
  });
});

describe("withTokenActor", () => {
  const agent = { actor: "agent", ownerId: OWNER_ID } as const;

  it("gives an MCP call's action the token's actor, whatever session there is", async () => {
    signInAs("stranger");
    expect(await withTokenActor(agent, getActionActor)).toEqual(agent);
  });

  it("lasts only for its call: before and after, an action reads the session", async () => {
    signInAs("stranger");
    const calls = [
      withTokenActor(agent, async () => {
        await Promise.resolve();
        return getActionActor();
      }),
      getActionActor().catch((err: unknown) => err),
    ];
    const [inside, outside] = await Promise.all(calls);
    expect(inside).toEqual(agent);
    expect(outside).toBeInstanceOf(NotAllowedError);
    expect(await getActionActor().catch((err: unknown) => err)).toBeInstanceOf(
      NotAllowedError,
    );
  });
});
