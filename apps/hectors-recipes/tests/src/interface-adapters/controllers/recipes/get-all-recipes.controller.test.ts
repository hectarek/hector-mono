import { describe } from "bun:test";
import { getAllRecipesController } from "@/src/interface-adapters/controllers/recipes/get-all-recipes.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics } from "@/tests/_support/controller";

describe("getAllRecipesController", () => {
  controllerBasics({
    make: (useCase, logger) => getAllRecipesController(useCase, logger),
    valid: { search: " pasta ", tag: "dinner" },
    calledWith: [OWNER, { search: "pasta", tag: "dinner" }],
    invalid: {
      "an overlong search": { search: "x".repeat(101) },
    },
  });
});
