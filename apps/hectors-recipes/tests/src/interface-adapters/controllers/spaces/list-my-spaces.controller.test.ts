import { describe } from "bun:test";
import { listMySpacesController } from "@/src/interface-adapters/controllers/spaces/list-my-spaces.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics } from "@/tests/_support/controller";

describe("listMySpacesController", () => {
  controllerBasics({
    make: (useCase, logger) => listMySpacesController(useCase, logger),
    valid: { type: "meal-plan" },
    calledWith: [OWNER, "meal-plan"],
    invalid: {
      "an unknown type": { type: "plan" },
    },
  });
});
