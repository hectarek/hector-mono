import { describe } from "bun:test";
import { grantPlanSubscriptionController } from "@/src/interface-adapters/controllers/realtime/grant-plan-subscription.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("grantPlanSubscriptionController", () => {
  controllerBasics({
    make: (useCase, logger) => grantPlanSubscriptionController(useCase, logger),
    valid: { planId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "no plan": {},
      "a malformed plan id": { planId: "plan:1" },
    },
  });
});
