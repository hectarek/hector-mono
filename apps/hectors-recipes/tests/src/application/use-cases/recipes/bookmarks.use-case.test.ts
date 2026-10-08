import { expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  PARTNER,
  STRANGER,
} from "@/tests/_support/app";

// D77: a person's own saved recipes, whatever book they're in.
describeEachBackend("bookmarks", () => {
  it("saves and unsaves, newest first, and saving twice keeps one", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const chili = (await app.newRecipe(bookId, { title: "Chili" })).id;
    const soup = (await app.newRecipe(bookId, { title: "Soup" })).id;

    await app.setBookmark(OWNER, chili, true);
    await app.setBookmark(OWNER, soup, true);
    await app.setBookmark(OWNER, chili, true);
    expect(await app.getBookmarks(OWNER)).toEqual([soup, chili]);

    await app.setBookmark(OWNER, soup, false);
    expect(await app.getBookmarks(OWNER)).toEqual([chili]);
  });

  it("keeps each person's own, in a shared book or out of it", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    await app.join(bookId, PARTNER, "viewer");
    const chili = (await app.newRecipe(bookId, { title: "Chili" })).id;

    await app.setBookmark(PARTNER, chili, true);
    // Anyone who can open a recipe's link can save it.
    await app.setBookmark(STRANGER, chili, true);
    expect(await app.getBookmarks(OWNER)).toEqual([]);
    expect(await app.getBookmarks(PARTNER)).toEqual([chili]);
    expect(await app.getBookmarks(STRANGER)).toEqual([chili]);
  });

  it("refuses a recipe that doesn't exist, and forgets one deleted", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const chili = (await app.newRecipe(bookId, { title: "Chili" })).id;
    await app.setBookmark(OWNER, chili, true);

    await expect(
      app.setBookmark(OWNER, crypto.randomUUID(), true),
    ).rejects.toBeInstanceOf(NotFoundError);
    await app.deleteRecipe(chili, OWNER);
    expect(await app.getBookmarks(OWNER)).toEqual([]);
  });
});
