import { expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  MONDAY,
  makeApp,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";

describeEachBackend("removePlanEntry", () => {
  it("removes the meal; acting on it afterwards is not found", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    const entry = await app.planMeal(planId, MONDAY);

    await app.removePlanEntry(entry.id, OWNER);
    expect(await app.getWeekPlan(planId, MONDAY, OWNER)).toEqual([]);
    await expect(
      app.setEntryCooked(entry.id, false, OWNER),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("viewers can't remove", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    const entry = await app.planMeal(planId, MONDAY);

    await app.join(planId, PARTNER, "viewer");
    await expect(app.removePlanEntry(entry.id, PARTNER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(await app.getWeekPlan(planId, MONDAY, OWNER)).toHaveLength(1);
  });
});
