import { describe } from "bun:test";
import { clearMealPlanController } from "@/src/interface-adapters/controllers/plan/clear-meal-plan.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("clearMealPlanController", () => {
  controllerBasics({
    make: (useCase, logger) => clearMealPlanController(useCase, logger),
    valid: { planId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { planId: "x" },
    },
  });
});
