import { beforeEach, expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import { planChannel } from "@/src/entities/realtime";
import {
  describeEachBackend,
  makeApp,
  PARTNER,
  STRANGER,
  type TestApp,
} from "@/tests/_support/app";

// A pass to listen to one plan's channel, only for someone in that plan (ux-plan D21).
describeEachBackend("grantPlanSubscription", () => {
  let app: TestApp;
  let planId: string;

  beforeEach(async () => {
    app = makeApp();
    planId = await app.newSpace("meal-plan");
  });

  it("gives a member, view-only included, a pass for that plan's channel only", async () => {
    await app.join(planId, PARTNER, "viewer");
    expect(await app.grantPlanSubscription(planId, PARTNER)).toEqual({
      channel: planChannel(planId),
      clientId: PARTNER,
      capability: ["subscribe"],
    });
  });

  it("refuses someone outside the plan, and a book passed off as a plan", async () => {
    await expect(
      app.grantPlanSubscription(planId, STRANGER),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const bookId = await app.newSpace("recipe-book");
    await expect(
      app.grantPlanSubscription(bookId, STRANGER),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
