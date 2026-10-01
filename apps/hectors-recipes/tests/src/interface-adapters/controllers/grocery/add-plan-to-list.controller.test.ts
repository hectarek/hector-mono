import { describe } from "bun:test";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { addPlanToListController } from "@/src/interface-adapters/controllers/grocery/add-plan-to-list.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("addPlanToListController", () => {
  controllerBasics({
    make: (useCase, logger) => addPlanToListController(useCase, logger),
    valid: { planId: ID, entryId: ID, range: "next-3-days", again: true },
    calledWith: [
      ID,
      OWNER,
      {
        entryId: ID,
        range: "next-3-days",
        again: true,
        today: todayIn(PLAN_TIME_ZONE),
      },
    ],
    invalid: {
      "no plan": { entryId: ID },
      "a malformed meal id": { planId: ID, entryId: "nope" },
      "a range it doesn't offer": { planId: ID, range: "next-year" },
    },
  });
});
