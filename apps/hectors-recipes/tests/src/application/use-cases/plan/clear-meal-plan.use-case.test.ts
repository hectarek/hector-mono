import { expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { addDays } from "@/src/entities/week";
import {
  describeEachBackend,
  MONDAY,
  makeApp,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";

// Starting a plan over (docs/ux-plan.md D91).
describeEachBackend("clearMealPlan", () => {
  it("removes every meal in every week, and leaves groceries as they are", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    await app.planMeal(planId, MONDAY);
    await app.planMeal(planId, addDays(MONDAY, -14));
    await app.planMeal(planId, addDays(MONDAY, 21));
    await app.addGroceryItem(planId, "Milk", OWNER);

    expect(await app.clearMealPlan(planId, OWNER)).toBe(3);
    expect(await app.hasMeals(planId, OWNER)).toBe(false);
    expect(
      (await app.getGroceryList(planId, OWNER)).map((item) => item.text),
    ).toEqual(["Milk"]);
  });

  it("viewers can't clear", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    await app.planMeal(planId, MONDAY);
    await app.join(planId, PARTNER, "viewer");

    await expect(app.clearMealPlan(planId, PARTNER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(await app.getWeekPlan(planId, MONDAY, OWNER)).toHaveLength(1);
  });

  it("leaves another plan's meals alone", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    const other = await app.newSpace("meal-plan", OWNER, "Other");
    await app.planMeal(planId, MONDAY);
    await app.planMeal(other, MONDAY);

    await app.clearMealPlan(planId, OWNER);
    expect(await app.getWeekPlan(other, MONDAY, OWNER)).toHaveLength(1);
  });
});
