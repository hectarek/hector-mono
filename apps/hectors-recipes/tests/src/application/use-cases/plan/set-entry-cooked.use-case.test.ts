import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  MONDAY,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("setEntryCooked", () => {
  let app: TestApp;
  let planId: string;
  let entryId: string;

  beforeEach(async () => {
    app = makeApp();
    planId = await app.newSpace("meal-plan");
    entryId = (await app.planMeal(planId, MONDAY)).id;
  });

  it("marks a meal cooked and back", async () => {
    await app.setEntryCooked(entryId, true, OWNER);
    expect((await app.getWeekPlan(planId, MONDAY, OWNER))[0]?.cooked).toBe(
      true,
    );
    await app.setEntryCooked(entryId, false, OWNER);
    expect((await app.getWeekPlan(planId, MONDAY, OWNER))[0]?.cooked).toBe(
      false,
    );
  });

  it("viewers can't", async () => {
    await app.join(planId, PARTNER, "viewer");
    await expect(
      app.setEntryCooked(entryId, true, PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
