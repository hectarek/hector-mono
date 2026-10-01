import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import type { InviteRole } from "@/src/entities/models/space.model";
import {
  describeEachBackend,
  makeApp,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

// The access rule every use case goes through, checked end to end on a recipe book.
describeEachBackend("requireSpaceRole", () => {
  let app: TestApp;
  let bookId: string;
  let recipeId: string;

  beforeEach(async () => {
    app = makeApp();
    bookId = await app.newSpace("recipe-book");
    recipeId = (await app.newRecipe(bookId)).id;
  });

  const cases: [InviteRole | "none", { read: boolean; write: boolean }][] = [
    ["none", { read: false, write: false }],
    ["viewer", { read: true, write: false }],
    ["editor", { read: true, write: true }],
  ];

  it.each(cases)("%p", async (role, can) => {
    if (role !== "none") {
      await app.join(bookId, PARTNER, role);
    }

    const read = () => app.getRecipes(bookId, PARTNER);
    const write = () =>
      app.updateRecipe(recipeId, { title: "Renamed" }, PARTNER);
    const add = () => app.newRecipe(bookId, { title: "New" }, PARTNER);

    if (can.read) {
      expect((await read()).recipes).toHaveLength(1);
    } else {
      await expect(read()).rejects.toBeInstanceOf(UnauthorizedError);
    }

    if (can.write) {
      expect((await write()).title).toBe("Renamed");
      expect((await add()).title).toBe("New");
    } else {
      await expect(write()).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(add()).rejects.toBeInstanceOf(UnauthorizedError);
    }
  });
});
