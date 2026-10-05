import { expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";

describeEachBackend("createRecipe", () => {
  it("stores the parsed quantity, unit and ingredient alongside the raw line", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const created = await app.newRecipe(bookId, {
      title: "Honey Garlic Chicken",
      ingredients: [
        { raw: "110 g (⅓ cup) honey" },
        { raw: "4 cloves minced garlic" },
        { raw: "Salt and pepper, to taste" },
      ],
    });

    const { recipe } = await app.getRecipe(created.id, OWNER);
    const [honey, garlic, salt] = recipe.ingredients;
    expect(honey).toMatchObject({
      raw: "110 g (⅓ cup) honey",
      quantity: 110,
      unit: "g",
    });
    expect(honey?.ingredientId).not.toBeNull();
    expect(garlic).toMatchObject({ quantity: 4, unit: "clove" });
    expect(salt).toMatchObject({ quantity: null, unit: null });
  });

  it("itemizes each line into a name, a note and an optional flag", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const created = await app.newRecipe(bookId, {
      ingredients: [
        { raw: "4 garlic cloves, minced" },
        { raw: "1/4 cup cashews (optional)" },
      ],
    });

    const { recipe } = await app.getRecipe(created.id, OWNER);
    expect(
      recipe.ingredients.map(({ name, note, optional }) => ({
        name,
        note,
        optional,
      })),
    ).toEqual([
      { name: "garlic", note: "minced", optional: false },
      { name: "cashews", note: null, optional: true },
    ]);
  });

  it("stores the editor's rows and steps, writing out the line for a typed row", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const created = await app.newRecipe(bookId, {
      ingredients: [
        { name: "garlic", quantity: 4, unit: "clove", note: "minced" },
        {
          raw: "Salt, to taste",
          name: "Salt",
          note: "to taste",
          section: "To serve",
        },
      ],
      steps: [
        { text: "Fry the garlic.", timerMinutes: 1, section: "Garlic oil" },
        { text: "Season." },
      ],
    });

    const { recipe } = await app.getRecipe(created.id, OWNER);
    expect(
      recipe.ingredients.map(({ raw, section, name, note }) => ({
        raw,
        section,
        name,
        note,
      })),
    ).toEqual([
      {
        raw: "4 cloves garlic, minced",
        section: null,
        name: "garlic",
        note: "minced",
      },
      {
        raw: "Salt, to taste",
        section: "To serve",
        name: "Salt",
        note: "to taste",
      },
    ]);
    expect(
      recipe.steps.map(({ text, timerMinutes, section }) => [
        text,
        timerMinutes,
        section,
      ]),
    ).toEqual([
      ["Fry the garlic.", 1, "Garlic oil"],
      ["Season.", null, null],
    ]);
  });
});

// D55: a tag made in the form is saved with its group, in the recipe's transaction.
describeEachBackend("createRecipe, new tags' groups", () => {
  it("gives a new tag its group, leaving an existing group and other tags alone", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    await app.createRecipe(
      {
        title: "Shakshuka",
        tags: ["brunch", "dinner", "weeknight"],
        ingredients: [{ raw: "6 eggs" }],
      },
      bookId,
      OWNER,
      { brunch: "meal", dinner: "diet", texan: "cuisine" },
    );

    const { tagGroups } = await app.getRecipes(bookId, OWNER);
    expect(tagGroups["brunch"]).toBe("meal");
    expect(tagGroups["dinner"]).toBe("meal");
    expect(tagGroups["weeknight"]).toBeUndefined();
    // Not one of the recipe's tags.
    expect(tagGroups["texan"]).toBeUndefined();
  });

  it("adds no group when a viewer's save is turned away", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    await app.join(bookId, PARTNER, "viewer");
    await expect(
      app.createRecipe(
        { title: "x", tags: ["brunch"], ingredients: [{ raw: "1 egg" }] },
        bookId,
        PARTNER,
        { brunch: "meal" },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const { tagGroups } = await app.getRecipes(bookId, OWNER);
    expect(tagGroups["brunch"]).toBeUndefined();
  });
});
