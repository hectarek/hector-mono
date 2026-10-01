import { expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";

describeEachBackend("deleteRecipe", () => {
  it("only members with edit rights can delete", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const { id } = await app.newRecipe(bookId);
    await app.join(bookId, PARTNER, "viewer");

    await expect(app.deleteRecipe(id, PARTNER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    // It says which book the recipe was in, so the app can go back to that book.
    expect(await app.deleteRecipe(id, OWNER)).toBe(bookId);
    expect((await app.getRecipes(bookId, OWNER)).recipes).toHaveLength(0);
  });
});
