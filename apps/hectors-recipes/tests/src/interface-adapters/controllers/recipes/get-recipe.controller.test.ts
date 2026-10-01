import { describe } from "bun:test";
import { getRecipeController } from "@/src/interface-adapters/controllers/recipes/get-recipe.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("getRecipeController", () => {
  controllerBasics({
    make: (useCase, logger) => getRecipeController(useCase, logger),
    valid: { recipeId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { recipeId: "not-a-uuid" },
    },
  });
});
