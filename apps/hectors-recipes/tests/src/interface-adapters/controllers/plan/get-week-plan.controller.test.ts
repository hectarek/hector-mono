import { describe } from "bun:test";
import { getWeekPlanController } from "@/src/interface-adapters/controllers/plan/get-week-plan.controller";
import { MONDAY, OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("getWeekPlanController", () => {
  controllerBasics({
    make: (useCase, logger) => getWeekPlanController(useCase, logger),
    valid: { spaceId: ID, date: "2026-09-27" },
    calledWith: [ID, MONDAY, OWNER],
    invalid: {
      "a malformed date": { spaceId: ID, date: "next week" },
    },
  });
});
