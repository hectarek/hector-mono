import { describe } from "bun:test";
import { deleteRecipeController } from "@/src/interface-adapters/controllers/recipes/delete-recipe.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("deleteRecipeController", () => {
  controllerBasics({
    make: (useCase, logger) => deleteRecipeController(useCase, logger),
    valid: { recipeId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { recipeId: "x" },
    },
  });
});
