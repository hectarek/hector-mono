import { describe } from "bun:test";
import { createSpaceController } from "@/src/interface-adapters/controllers/spaces/create-space.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics } from "@/tests/_support/controller";

describe("createSpaceController", () => {
  controllerBasics({
    make: (useCase, logger) => createSpaceController(useCase, logger),
    valid: { type: "recipe-book", name: " Home " },
    calledWith: [{ type: "recipe-book", name: "Home" }, OWNER],
    invalid: {
      "an unknown type": { type: "book", name: "Home" },
      "a blank name": { type: "meal-plan", name: "  " },
    },
  });
});
