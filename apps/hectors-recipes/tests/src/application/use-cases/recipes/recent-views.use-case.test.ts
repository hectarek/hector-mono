import { expect, it, spyOn } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  STRANGER,
} from "@/tests/_support/app";

// D106: the recipes each person opened, from their `recipe-viewed` events, the most recent
// first.
describeEachBackend("recent views", () => {
  it("lists the most recent first, and opening one again moves it up", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const chili = (await app.newRecipe(bookId, { title: "Chili" })).id;
    const soup = (await app.newRecipe(bookId, { title: "Soup" })).id;
    const dal = (await app.newRecipe(bookId, { title: "Dal" })).id;

    await app.recordView(OWNER, chili);
    await app.recordView(OWNER, soup);
    await app.recordView(OWNER, dal);
    expect(await app.getRecentViews(OWNER)).toEqual([dal, soup, chili]);

    await app.recordView(OWNER, chili);
    expect(await app.getRecentViews(OWNER)).toEqual([chili, dal, soup]);
  });

  it("counts a reload or a Back to the same recipe once, and the same recipe after another again", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const chili = (await app.newRecipe(bookId, { title: "Chili" })).id;
    const soup = (await app.newRecipe(bookId, { title: "Soup" })).id;
    const add = spyOn(app.repos.activity, "add");

    await app.recordView(OWNER, chili);
    await app.recordView(OWNER, chili);
    expect(add).toHaveBeenCalledTimes(1);

    await app.recordView(OWNER, soup);
    await app.recordView(OWNER, chili);
    expect(add).toHaveBeenCalledTimes(3);
    expect(await app.getRecentViews(OWNER)).toEqual([chili, soup]);
  });

  it("keeps each person's own, in a shared book or out of it", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    await app.join(bookId, PARTNER, "viewer");
    const chili = (await app.newRecipe(bookId, { title: "Chili" })).id;

    await app.recordView(PARTNER, chili);
    // Anyone who can open a recipe's link can view it.
    await app.recordView(STRANGER, chili);
    expect(await app.getRecentViews(OWNER)).toEqual([]);
    expect(await app.getRecentViews(PARTNER)).toEqual([chili]);
    expect(await app.getRecentViews(STRANGER)).toEqual([chili]);
  });

  it("refuses a recipe that doesn't exist, and forgets one deleted", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const chili = (await app.newRecipe(bookId, { title: "Chili" })).id;
    await app.recordView(OWNER, chili);

    await expect(
      app.recordView(OWNER, crypto.randomUUID()),
    ).rejects.toBeInstanceOf(NotFoundError);
    await app.deleteRecipe(chili, OWNER);
    expect(await app.getRecentViews(OWNER)).toEqual([]);
  });
});
