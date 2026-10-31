import { expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  STRANGER,
} from "@/tests/_support/app";

// D98: a recipe's view-only public link, turned on and off by its book's owner and editors.
describeEachBackend("setRecipeLink", () => {
  it("turns the link on and off, keeping it while on and making a new one after", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const { id } = await app.newRecipe(bookId);
    await app.join(bookId, PARTNER, "editor");

    const token = await app.setRecipeLink(id, true, OWNER);
    expect(token).toMatch(/^[\w-]{24}$/);
    expect(await app.setRecipeLink(id, true, PARTNER)).toBe(token);
    expect((await app.getSharedRecipe(token ?? "")).id).toBe(id);

    expect(await app.setRecipeLink(id, false, PARTNER)).toBeNull();
    await expect(app.getSharedRecipe(token ?? "")).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const again = await app.setRecipeLink(id, true, OWNER);
    expect(again).not.toBe(token);
    expect((await app.getSharedRecipe(again ?? "")).id).toBe(id);
  });

  it("refuses viewers and strangers, and a recipe that isn't there", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const { id } = await app.newRecipe(bookId);
    await app.join(bookId, PARTNER, "viewer");

    await expect(app.setRecipeLink(id, true, PARTNER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    await expect(app.setRecipeLink(id, true, STRANGER)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect((await app.getRecipe(id, OWNER)).shareToken).toBeNull();
    await expect(
      app.setRecipeLink(crypto.randomUUID(), true, OWNER),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  // getRecipe gives the link to those who can turn it off, and to no one else.
  it("shows the link to editors only", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const { id } = await app.newRecipe(bookId);
    await app.join(bookId, PARTNER, "viewer");
    const token = await app.setRecipeLink(id, true, OWNER);

    expect((await app.getRecipe(id, OWNER)).shareToken).toBe(token);
    expect((await app.getRecipe(id, PARTNER)).shareToken).toBeNull();
    expect((await app.getRecipe(id, STRANGER)).shareToken).toBeNull();
  });
});
