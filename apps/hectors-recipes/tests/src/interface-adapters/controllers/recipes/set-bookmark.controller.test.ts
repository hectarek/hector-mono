import { describe } from "bun:test";
import { setBookmarkController } from "@/src/interface-adapters/controllers/recipes/set-bookmark.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("setBookmarkController", () => {
  controllerBasics({
    make: (useCase, logger) => setBookmarkController(useCase, logger),
    valid: { recipeId: ID, saved: true },
    calledWith: [OWNER, ID, true],
    invalid: {
      "a recipe id that isn't one": { recipeId: "chili", saved: true },
      "no saved or not": { recipeId: ID },
    },
  });
});
