import { beforeEach, describe, expect, it } from "bun:test";
import { loadPlans } from "@/app/_lib/load-plans";
import { getInjection } from "@/di/container";
import { NotFoundPage, signInAsNewUser } from "@/tests/_support/next";

describe("loadPlans", () => {
  let userId: string;

  beforeEach(() => {
    userId = signInAsNewUser();
  });

  it("creates a personal plan only when they're in none", async () => {
    const first = await loadPlans(userId, undefined);
    expect(first.current.name).toBe("My Plan");
    const again = await loadPlans(userId, undefined);
    expect(again.plans).toHaveLength(1);
  });

  it("shows a shared plan by default, and doesn't create an empty one of their own", async () => {
    const owner = crypto.randomUUID();
    const shared = await getInjection("ICreateSpaceController")(
      { type: "meal-plan", name: "Ours" },
      owner,
    );
    const invite = await getInjection("ICreateInviteController")(
      { spaceId: shared.id, role: "editor" },
      owner,
    );
    await getInjection("IAcceptInviteController")(
      { token: invite.token },
      userId,
    );

    const { plans, current } = await loadPlans(userId, undefined);
    expect(current.id).toBe(shared.id);
    expect(plans).toHaveLength(1);
  });

  it("404s for a plan they're not in", async () => {
    const theirs = await getInjection("ICreateSpaceController")(
      { type: "meal-plan", name: "Private" },
      crypto.randomUUID(),
    );
    await expect(loadPlans(userId, theirs.id)).rejects.toBeInstanceOf(
      NotFoundPage,
    );
  });
});
