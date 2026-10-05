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

  // D56: listed recipes carry their ingredients' names as written, which search reads.
  it("lists each recipe's ingredient names in order, and searches them", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    await app.newRecipe(bookId, {
      title: "Kofta",
      ingredients: [
        { raw: "1 lb ground beef" },
        { raw: "2 tsp ground cumin" },
        { raw: "1 onion, grated" },
      ],
    });
    await app.newRecipe(bookId, {
      title: "Pancakes",
      ingredients: [{ raw: "2 cups flour" }],
    });

    const all = await app.getRecipes(bookId, OWNER);
    expect(all.recipes.map((recipe) => recipe.ingredientNames)).toEqual([
      ["ground beef", "ground cumin", "onion"],
      ["flour"],
    ]);

    const cumin = await app.getRecipes(bookId, OWNER, { search: "cumin" });
    expect(cumin.recipes.map((recipe) => recipe.title)).toEqual(["Kofta"]);
  });

  // D55: each grouped tag's group comes with the library, for grouping and the tag picker.
  it("gives each grouped tag's group, and none for a tag without one", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    await app.newRecipe(bookId, {
      title: "Pesto Pasta",
      tags: ["dinner", "italian", "vegetarian", "weeknight"],
    });

    const { tagGroups } = await app.getRecipes(bookId, OWNER);
    expect(tagGroups["dinner"]).toBe("meal");
    expect(tagGroups["italian"]).toBe("cuisine");
    expect(tagGroups["vegetarian"]).toBe("diet");
    expect(tagGroups["weeknight"]).toBeUndefined();
  });

  it("rejects listing a space as the wrong type", async () => {
    const app = makeApp();
    const planId = await app.newSpace("meal-plan");
    await expect(app.getRecipes(planId, OWNER)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
