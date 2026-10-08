import { beforeEach, describe, expect, it } from "bun:test";
import { loadRecipe } from "@/app/_lib/load-recipe";
import { NotFoundPage, signInAsNewUser } from "@/tests/_support/next";

describe("loadRecipe", () => {
  let userId: string;

  beforeEach(() => {
    userId = signInAsNewUser();
  });

  it("an unknown or malformed recipe id is a 404, not an error page", async () => {
    await expect(
      loadRecipe(crypto.randomUUID(), userId),
    ).rejects.toBeInstanceOf(NotFoundPage);
    await expect(loadRecipe("not-an-id", userId)).rejects.toBeInstanceOf(
      NotFoundPage,
    );
  });
});
