import { expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { describeEachBackend, makeApp, OWNER } from "@/tests/_support/app";

describeEachBackend("getRecipes", () => {
  it("filters the library by search and tag, keeping every tag as a chip", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    await app.newRecipe(bookId, { title: "Honey Garlic Chicken" });
    await app.newRecipe(bookId, {
      title: "Pesto Pasta",
      tags: ["dinner", "italian"],
    });
    await app.newRecipe(bookId, { title: "Banana Bread", tags: ["dessert"] });

    const all = await app.getRecipes(bookId, OWNER);
    expect(all.recipes.map((recipe) => recipe.title)).toEqual([
      "Banana Bread",
      "Honey Garlic Chicken",
      "Pesto Pasta",
    ]);
    expect(all.tags).toEqual(["dessert", "dinner", "italian"]);

    const pasta = await app.getRecipes(bookId, OWNER, { search: "PASTA" });
    expect(pasta.recipes.map((recipe) => recipe.title)).toEqual([
      "Pesto Pasta",
    ]);
    expect(pasta.tags).toEqual(all.tags);

    const dinner = await app.getRecipes(bookId, OWNER, { tag: "dinner" });
    expect(dinner.recipes.map((recipe) => recipe.title)).toEqual([
      "Pesto Pasta",
    ]);
  });

  it("rejects listing a space as the wrong type", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    await expect(app.getRecipes(planId, OWNER)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
