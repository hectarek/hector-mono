import { describe } from "bun:test";
import { setRecipeLinkController } from "@/src/interface-adapters/controllers/recipes/set-recipe-link.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("setRecipeLinkController", () => {
  controllerBasics({
    make: (useCase, logger) => setRecipeLinkController(useCase, logger),
    valid: { recipeId: ID, shared: true },
    calledWith: [ID, true, OWNER],
    invalid: {
      "a recipe id that isn't one": { recipeId: "chili", shared: true },
      "on or off as text": { recipeId: ID, shared: "true" },
    },
  });
});
