import { beforeEach, expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  MONDAY,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("addPlanEntry", () => {
  let app: TestApp;
  let planId: string;
  let bookId: string;

  beforeEach(async () => {
    app = makeApp();
    planId = await app.newSpace("meal-plan");
    bookId = await app.newSpace("recipe-book");
  });

  it("plans a recipe, copying its title, with its cook day and eat days", async () => {
    const chili = await app.newRecipe(bookId, { title: "Turkey Chili" });
    await app.addPlanEntry(
      {
        spaceId: planId,
        recipeId: chili.id,
        cookDate: "2026-09-20",
        eatDates: ["2026-09-21", "2026-09-23"],
      },
      OWNER,
    );

    const [entry] = await app.getWeekPlan(planId, MONDAY, OWNER);
    expect(entry).toMatchObject({
      title: "Turkey Chili",
      recipeId: chili.id,
      cookDate: "2026-09-20",
      eatDates: ["2026-09-21", "2026-09-23"],
      cooked: false,
      addedToListAt: null,
    });
  });

  it("shows the recipe's name as it is now, and the saved one once it's deleted", async () => {
    const chili = await app.newRecipe(bookId, {
      title: "Turkey Chili | Bon Appetit",
    });
    await app.planMeal(planId, MONDAY, { recipeId: chili.id });
    await app.updateRecipe(chili.id, { title: "Turkey Chili" }, OWNER);
    expect((await app.getWeekPlan(planId, MONDAY, OWNER))[0]?.title).toBe(
      "Turkey Chili",
    );

    await app.deleteRecipe(chili.id, OWNER);
    expect((await app.getWeekPlan(planId, MONDAY, OWNER))[0]?.title).toBe(
      "Turkey Chili | Bon Appetit",
    );
  });

  it("needs a recipe that exists", async () => {
    await expect(
      app.planMeal(planId, MONDAY, { recipeId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("viewers can't add", async () => {
    await app.join(planId, PARTNER, "viewer");
    await expect(
      app.planMeal(planId, MONDAY, { userId: PARTNER }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("won't put meals in a recipe book", async () => {
    await expect(app.planMeal(bookId, MONDAY)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
