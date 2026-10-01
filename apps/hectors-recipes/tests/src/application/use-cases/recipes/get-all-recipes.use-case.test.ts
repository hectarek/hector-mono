import { expect, it } from "bun:test";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  STRANGER,
} from "@/tests/_support/app";

describeEachBackend("getAllRecipes", () => {
  it("lists every book the user is in as one library, by title", async () => {
    const app = makeApp();
    const mine = await app.newSpace("recipe-book");
    const shared = await app.newSpace("recipe-book", PARTNER);
    await app.join(shared, OWNER, "viewer");
    const strangers = await app.newSpace("recipe-book", STRANGER);
    await app.newRecipe(mine, { title: "Pesto Pasta", tags: ["dinner"] });
    await app.newRecipe(
      shared,
      { title: "Banana Bread", tags: ["dessert"] },
      PARTNER,
    );
    await app.newRecipe(shared, { title: "Chili", tags: ["dinner"] }, PARTNER);
    await app.newRecipe(strangers, { title: "Secret Stew" }, STRANGER);

    const all = await app.getAllRecipes(OWNER);
    expect(all.recipes.map((recipe) => recipe.title)).toEqual([
      "Banana Bread",
      "Chili",
      "Pesto Pasta",
    ]);
    expect(all.tags).toEqual(["dinner", "dessert"]);

    const dinner = await app.getAllRecipes(OWNER, { tag: "dinner" });
    expect(dinner.recipes.map((recipe) => recipe.title)).toEqual([
      "Chili",
      "Pesto Pasta",
    ]);
  });
});
