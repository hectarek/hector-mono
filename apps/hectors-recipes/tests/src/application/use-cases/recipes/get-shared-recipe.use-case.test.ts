import { expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { describeEachBackend, makeApp, OWNER } from "@/tests/_support/app";

// D99: what a view-only public link shows someone who isn't signed in.
describeEachBackend("getSharedRecipe", () => {
  it("gives the recipe itself, and nothing about its book or who wrote it", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const { id } = await app.newRecipe(bookId, {
      title: "Chili",
      tags: ["dinner"],
      yieldServings: 4,
    });
    const token = (await app.setRecipeLink(id, true, OWNER)) ?? "";

    const shared = await app.getSharedRecipe(token);
    expect(shared).toMatchObject({ id, title: "Chili", yieldServings: 4 });
    expect(shared.ingredients.length).toBeGreaterThan(0);
    expect(Object.keys(shared).sort()).toEqual(
      [
        "description",
        "id",
        "imageUrl",
        "ingredients",
        "sourceUrl",
        "steps",
        "timeMinutes",
        "title",
        "videoUrl",
        "yieldServings",
      ].sort(),
    );
  });

  it("finds nothing for a link that never was", async () => {
    const app = makeApp();
    await expect(
      app.getSharedRecipe("aaaaaaaaaaaaaaaaaaaaaaaa"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
