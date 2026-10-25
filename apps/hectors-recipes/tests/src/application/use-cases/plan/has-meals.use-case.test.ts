import { expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { addDays } from "@/src/entities/week";
import {
  describeEachBackend,
  MONDAY,
  makeApp,
  OWNER,
  PARTNER,
  STRANGER,
} from "@/tests/_support/app";

// Whether Meal plan offers Clear meal plan (D91).
describeEachBackend("hasMeals", () => {
  it("says whether the plan has a meal in any week, to its members only", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    await app.join(planId, PARTNER, "viewer");
    expect(await app.hasMeals(planId, OWNER)).toBe(false);

    await app.planMeal(planId, addDays(MONDAY, 35));
    expect(await app.hasMeals(planId, OWNER)).toBe(true);
    expect(await app.hasMeals(planId, PARTNER)).toBe(true);
    await expect(app.hasMeals(planId, STRANGER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
