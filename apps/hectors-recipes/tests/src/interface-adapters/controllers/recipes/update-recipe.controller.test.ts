import { describe } from "bun:test";
import { updateRecipeController } from "@/src/interface-adapters/controllers/recipes/update-recipe.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("updateRecipeController", () => {
  controllerBasics({
    make: (useCase, logger) => updateRecipeController(useCase, logger),
    valid: { recipeId: ID, data: { title: "New name" } },
    calledWith: [ID, { title: "New name" }, OWNER],
    invalid: {
      "a malformed id": { recipeId: "x", data: { title: "x" } },
      "a negative time": { recipeId: ID, data: { timeMinutes: -5 } },
    },
  });
});
