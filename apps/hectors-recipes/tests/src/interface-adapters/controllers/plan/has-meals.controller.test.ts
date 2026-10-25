import { describe } from "bun:test";
import { hasMealsController } from "@/src/interface-adapters/controllers/plan/has-meals.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("hasMealsController", () => {
  controllerBasics({
    make: (useCase, logger) => hasMealsController(useCase, logger),
    valid: { planId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { planId: "x" },
    },
  });
});
