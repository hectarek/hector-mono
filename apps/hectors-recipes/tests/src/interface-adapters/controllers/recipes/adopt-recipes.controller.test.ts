import { describe } from "bun:test";
import { adoptRecipesController } from "@/src/interface-adapters/controllers/recipes/adopt-recipes.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID, ID2 } from "@/tests/_support/controller";

describe("adoptRecipesController", () => {
  controllerBasics({
    make: (useCase, logger) => adoptRecipesController(useCase, logger),
    valid: { recipeIds: [ID, ID, ID2], targetSpaceId: ID },
    calledWith: [[ID, ID2], ID, OWNER],
    invalid: {
      "no recipes": { recipeIds: [], targetSpaceId: ID },
    },
  });
});
