import { expect, it } from "bun:test";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  STRANGER,
} from "@/tests/_support/app";

describeEachBackend("getRecipe", () => {
  it("lets any signed-in user read a recipe by id, but only editors edit", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const { id } = await app.newRecipe(bookId, {
      title: "Honey Garlic Chicken",
    });

    const asStranger = await app.getRecipe(id, STRANGER);
    expect(asStranger.recipe.title).toBe("Honey Garlic Chicken");
    expect(asStranger.canEdit).toBe(false);
    expect((await app.getRecipe(id, OWNER)).canEdit).toBe(true);

    await app.join(bookId, STRANGER, "viewer");
    expect((await app.getRecipe(id, STRANGER)).canEdit).toBe(false);
  });
});
