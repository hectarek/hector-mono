import { expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";

describeEachBackend("adoptRecipes", () => {
  it("copies into a book you can edit and keeps copies independent", async () => {
    const app = makeApp();
    const theirs = await app.newSpace("recipe-book", PARTNER, "Friend's");
    const mine = await app.newSpace("recipe-book", OWNER, "Mine");
    const original = await app.newRecipe(
      theirs,
      {
        title: "Pesto",
        tags: ["dinner"],
        ingredients: [
          { raw: "2 cups basil" },
          { raw: "Salt", section: "To serve" },
        ],
      },
      PARTNER,
    );

    expect(await app.adoptRecipes([original.id], mine, OWNER)).toBe(1);
    const [summary] = (await app.getRecipes(mine, OWNER)).recipes;
    const { recipe: copy } = await app.getRecipe(summary?.id ?? "", OWNER);

    expect(copy.copiedFromRecipeId).toBe(original.id);
    expect(
      copy.ingredients.map((line) => [line.raw, line.section, line.quantity]),
    ).toEqual([
      ["2 cups basil", null, 2],
      ["Salt", "To serve", null],
    ]);

    await app.updateRecipe(copy.id, { title: "My pesto" }, OWNER);
    expect((await app.getRecipe(original.id, PARTNER)).recipe.title).toBe(
      "Pesto",
    );
  });

  it("copies the itemized lines and steps as stored, without splitting them again", async () => {
    const app = makeApp();
    const theirs = await app.newSpace("recipe-book", PARTNER);
    const mine = await app.newSpace("recipe-book", OWNER);
    const original = await app.newRecipe(theirs, {}, PARTNER);
    // As a careful (AI) read would store it, which the text split wouldn't produce.
    const stored = {
      raw: "1 lb beans",
      quantity: 1,
      unit: "lb",
      name: "dried pinto beans",
      note: "soaked overnight",
      optional: true,
    };
    await app.repos.recipes.update(original.id, {
      ingredients: [{ ...stored, catalogName: "pinto bean" }],
      steps: [{ text: "Simmer.", timerMinutes: 90, section: "Beans" }],
    });

    await app.adoptRecipes([original.id], mine, OWNER);
    const [summary] = (await app.getRecipes(mine, OWNER)).recipes;
    const { recipe: copy } = await app.getRecipe(summary?.id ?? "", OWNER);
    const source = (await app.getRecipe(original.id, OWNER)).recipe;

    expect(copy.ingredients[0]).toMatchObject({
      ...stored,
      ingredientId: source.ingredients[0]?.ingredientId,
    });
    expect(copy.steps).toEqual([
      {
        recipeId: copy.id,
        position: 0,
        text: "Simmer.",
        timerMinutes: 90,
        section: "Beans",
      },
    ]);
  });

  it("copies several at once, and nothing if one of them is gone", async () => {
    const app = makeApp();
    const theirs = await app.newSpace("recipe-book", PARTNER);
    const mine = await app.newSpace("recipe-book", OWNER);
    const ids = [
      (await app.newRecipe(theirs, { title: "Soup" }, PARTNER)).id,
      (await app.newRecipe(theirs, { title: "Salad" }, PARTNER)).id,
    ];

    await expect(
      app.adoptRecipes([...ids, crypto.randomUUID()], mine, OWNER),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await app.getRecipes(mine, OWNER)).recipes).toEqual([]);

    expect(await app.adoptRecipes(ids, mine, OWNER)).toBe(2);
    expect(
      (await app.getRecipes(mine, OWNER)).recipes.map((recipe) => recipe.title),
    ).toEqual(["Salad", "Soup"]);
  });

  it("can't copy into a book you only view", async () => {
    const app = makeApp();
    const home = await app.newSpace("recipe-book");
    const recipe = await app.newRecipe(home);
    await app.join(home, PARTNER, "viewer");

    await expect(
      app.adoptRecipes([recipe.id], home, PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
