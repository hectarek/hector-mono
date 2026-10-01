import { beforeEach, describe, expect, it } from "bun:test";
import { GET } from "@/app/(api)/api/realtime/token/route";
import { getInjection } from "@/di/container";
import { planChannel } from "@/src/entities/realtime";
import { nextState, signInAsNewUser } from "@/tests/_support/next";

const pass = (plan: string) =>
  GET(new Request(`http://localhost/api/realtime/token?plan=${plan}`));

describe("GET /api/realtime/token", () => {
  let userId: string;

  beforeEach(() => {
    userId = signInAsNewUser();
  });

  it("gives someone in the plan a pass for its channel, never cached", async () => {
    const plan = await getInjection("IEnsurePersonalSpaceController")(
      "meal-plan",
      userId,
    );
    const response = await pass(plan.id);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      channel: planChannel(plan.id),
      clientId: userId,
    });
  });

  it("refuses with 403 (Ably stops retrying), and asks to sign in with 401", async () => {
    const theirs = await getInjection("ICreateSpaceController")(
      { type: "meal-plan", name: "Theirs" },
      crypto.randomUUID(),
    );
    expect((await pass(theirs.id)).status).toBe(403);
    expect((await pass("not-a-plan")).status).toBe(403);

    nextState.userId = undefined;
    expect((await pass(theirs.id)).status).toBe(401);
  });
});
