import { describe } from "bun:test";
import { getRecipesController } from "@/src/interface-adapters/controllers/recipes/get-recipes.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("getRecipesController", () => {
  controllerBasics({
    make: (useCase, logger) => getRecipesController(useCase, logger),
    valid: { spaceId: ID, search: " pasta " },
    calledWith: [ID, OWNER, { search: "pasta", tag: undefined }],
    invalid: {
      "a malformed book id": { spaceId: "x" },
    },
  });
});
