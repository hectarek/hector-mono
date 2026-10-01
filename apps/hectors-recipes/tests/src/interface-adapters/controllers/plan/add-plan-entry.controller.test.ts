import { describe } from "bun:test";
import { addPlanEntryController } from "@/src/interface-adapters/controllers/plan/add-plan-entry.controller";
import { MONDAY, OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("addPlanEntryController", () => {
  controllerBasics({
    make: (useCase, logger) => addPlanEntryController(useCase, logger),
    // Eat days come back sorted, each once.
    valid: {
      spaceId: ID,
      recipeId: ID,
      cookDate: MONDAY,
      eatDates: ["2026-09-23", MONDAY, "2026-09-23"],
    },
    calledWith: [
      {
        spaceId: ID,
        recipeId: ID,
        cookDate: MONDAY,
        eatDates: [MONDAY, "2026-09-23"],
      },
      OWNER,
    ],
    invalid: {
      "no recipe": { spaceId: ID, cookDate: MONDAY, eatDates: [MONDAY] },
      "no eat days": {
        spaceId: ID,
        recipeId: ID,
        cookDate: MONDAY,
        eatDates: [],
      },
      "eaten before it's cooked": {
        spaceId: ID,
        recipeId: ID,
        cookDate: MONDAY,
        eatDates: ["2026-09-20"],
      },
      "a date that doesn't exist": {
        spaceId: ID,
        recipeId: ID,
        cookDate: "2026-02-30",
        eatDates: ["2026-03-01"],
      },
    },
  });
});
