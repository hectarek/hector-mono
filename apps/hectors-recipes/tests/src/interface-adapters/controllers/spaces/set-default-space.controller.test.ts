import { describe } from "bun:test";
import { setDefaultSpaceController } from "@/src/interface-adapters/controllers/spaces/set-default-space.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("setDefaultSpaceController", () => {
  controllerBasics({
    make: (useCase, logger) => setDefaultSpaceController(useCase, logger),
    valid: { type: "meal-plan", spaceId: ID },
    calledWith: [OWNER, "meal-plan", ID],
    invalid: {
      "an unknown type": { type: "shopping-list", spaceId: ID },
      "a malformed id": { type: "recipe-book", spaceId: "x" },
    },
  });
});
