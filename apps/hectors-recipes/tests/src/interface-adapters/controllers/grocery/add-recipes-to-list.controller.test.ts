import { describe } from "bun:test";
import { addRecipesToListController } from "@/src/interface-adapters/controllers/grocery/add-recipes-to-list.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID, ID2 } from "@/tests/_support/controller";

describe("addRecipesToListController", () => {
  controllerBasics({
    make: (useCase, logger) => addRecipesToListController(useCase, logger),
    valid: {
      planId: ID,
      recipes: [{ recipeId: ID2, servings: 4 }],
      again: true,
    },
    calledWith: [ID, [{ recipeId: ID2, servings: 4 }], OWNER, { again: true }],
    invalid: {
      "no plan": { recipes: [{ recipeId: ID2 }] },
      "no recipes": { planId: ID, recipes: [] },
      "zero servings": {
        planId: ID,
        recipes: [{ recipeId: ID2, servings: 0 }],
      },
    },
  });
});
