import { describe } from "bun:test";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { listMealsToAddController } from "@/src/interface-adapters/controllers/grocery/list-meals-to-add.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("listMealsToAddController", () => {
  controllerBasics({
    make: (useCase, logger) => listMealsToAddController(useCase, logger),
    valid: { planId: ID },
    calledWith: [ID, OWNER, todayIn(PLAN_TIME_ZONE)],
    invalid: { "a malformed plan id": { planId: "nope" } },
  });
});
