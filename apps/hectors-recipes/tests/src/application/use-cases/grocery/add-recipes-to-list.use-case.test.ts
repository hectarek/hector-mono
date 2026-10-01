import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { describeEachBackend, OWNER, PARTNER } from "@/tests/_support/app";
import { type GroceryFixture, groceryFixture } from "@/tests/_support/grocery";

describeEachBackend("addRecipesToList", () => {
  let g: GroceryFixture;

  beforeEach(async () => {
    g = await groceryFixture();
  });

  it("adds a recipe scaled to the chosen servings", async () => {
    const result = await g.app.addRecipesToList(
      g.planId,
      [{ recipeId: g.chiliId, servings: 8 }],
      OWNER,
    );
    expect(result).toMatchObject({ added: 3, merged: 0, skipped: 0 });
    expect(await g.texts()).toEqual([
      ["4 cloves garlic", "Chili"],
      ["2 lb ground turkey", "Chili"],
      ["Salt", "Chili"],
    ]);
  });

  it("asks before adding a recipe that's still on the list, and adds it when asked again", async () => {
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);

    expect(
      await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER),
    ).toMatchObject({ added: 0, merged: 0, skipped: 0, alreadyAdded: 1 });
    expect(await g.texts()).toContainEqual(["1 lb ground turkey", "Chili"]);

    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER, {
      again: true,
    });
    expect(await g.texts()).toContainEqual(["2 lb ground turkey", "Chili"]);
  });

  it("once its items are checked off, the recipe isn't on the list any more", async () => {
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    for (const item of await g.app.getGroceryList(g.planId, OWNER)) {
      await g.app.setGroceryItemChecked(item.id, true, OWNER);
    }

    expect(
      await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER),
    ).toMatchObject({ added: 3, alreadyAdded: 0 });
  });

  it("merges a second recipe into what's already on the list", async () => {
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    const result = await g.app.addRecipesToList(
      g.planId,
      [{ recipeId: g.tacosId }],
      OWNER,
    );

    expect(result).toMatchObject({ added: 0, merged: 1, skipped: 1 });
    expect(await g.texts()).toEqual([
      ["6 cloves garlic", "Chili, Tacos"],
      ["1 lb ground turkey", "Chili"],
      ["Salt", "Chili, Tacos"],
    ]);
  });

  it("never merges into items already checked off", async () => {
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    const [garlic] = await g.app.getGroceryList(g.planId, OWNER);
    await g.app.setGroceryItemChecked(garlic?.id ?? "", true, OWNER);

    await g.app.addRecipesToList(g.planId, [{ recipeId: g.tacosId }], OWNER);
    expect((await g.texts()).map(([text]) => text)).toEqual([
      "2 cloves garlic",
      "1 lb ground turkey",
      "Salt",
      "4 cloves garlic",
    ]);
  });

  it("adds the amount and name without the note, and leaves optional lines off", async () => {
    const recipeId = (
      await g.app.newRecipe(g.bookId, {
        title: "Omelette",
        yieldServings: 1,
        ingredients: [
          { raw: "1 onion, diced" },
          { raw: "2 large eggs, beaten" },
          { raw: "1 can (14 ounces) crushed tomatoes" },
          { raw: "Chives, to serve (optional)" },
        ],
      })
    ).id;

    await g.app.addRecipesToList(g.planId, [{ recipeId, servings: 2 }], OWNER);
    expect(await g.texts()).toEqual([
      ["2 onions", "Omelette"],
      ["4 large eggs", "Omelette"],
      ["2 cans crushed tomatoes (14 ounces)", "Omelette"],
    ]);
  });

  it("viewers can't add", async () => {
    await g.app.join(g.planId, PARTNER, "viewer");
    await expect(
      g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
