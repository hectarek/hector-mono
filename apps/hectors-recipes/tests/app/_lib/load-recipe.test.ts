import { beforeEach, describe, expect, it } from "bun:test";
import { loadRecipe } from "@/app/_lib/load-recipe";
import { NotFoundPage, signInAsNewUser } from "@/tests/_support/next";

describe("loadRecipe", () => {
  beforeEach(() => {
    signInAsNewUser();
  });

  it("an unknown or malformed recipe id is a 404, not an error page", async () => {
    await expect(loadRecipe(crypto.randomUUID())).rejects.toBeInstanceOf(
      NotFoundPage,
    );
    await expect(loadRecipe("not-an-id")).rejects.toBeInstanceOf(NotFoundPage);
  });
});
