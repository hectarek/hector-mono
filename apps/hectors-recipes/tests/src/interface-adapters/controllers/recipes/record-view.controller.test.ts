import { describe } from "bun:test";
import { recordViewController } from "@/src/interface-adapters/controllers/recipes/record-view.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("recordViewController", () => {
  controllerBasics({
    make: (useCase, logger) => recordViewController(useCase, logger),
    valid: { recipeId: ID },
    calledWith: [OWNER, ID],
    invalid: {
      "a recipe id that isn't one": { recipeId: "chili" },
      "no recipe": {},
    },
  });
});
