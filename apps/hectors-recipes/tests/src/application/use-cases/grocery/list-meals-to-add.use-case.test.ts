import { expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  MONDAY,
  makeApp,
  OWNER,
  STRANGER,
} from "@/tests/_support/app";

describeEachBackend("listMealsToAdd", () => {
  it("gives the cook days of meals from today on, not cooked and not on the list; only members may ask", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    await app.planMeal(planId, "2026-09-25");
    await app.planMeal(planId, MONDAY);
    await app.planMeal(planId, "2026-09-20");
    const cooked = await app.planMeal(planId, "2026-10-01");
    await app.setEntryCooked(cooked.id, true, OWNER);

    expect(await app.listMealsToAdd(planId, OWNER, MONDAY)).toEqual([
      MONDAY,
      "2026-09-25",
    ]);
    await expect(
      app.listMealsToAdd(planId, STRANGER, MONDAY),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

// The database forgets a deleted recipe's id on its meals; the mock must too, or the button
// counts a meal it can never add.
describeEachBackend("listMealsToAdd after a recipe is deleted", () => {
  it("leaves out a meal whose recipe is gone", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    const bookId = await app.newSpace("recipe-book");
    const recipe = await app.newRecipe(bookId, { title: "Chili" });
    await app.planMeal(planId, MONDAY, { recipeId: recipe.id });
    await app.deleteRecipe(recipe.id, OWNER);
    expect(await app.listMealsToAdd(planId, OWNER, MONDAY)).toEqual([]);
  });
});
