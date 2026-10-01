import { describe } from "bun:test";
import { removePlanEntryController } from "@/src/interface-adapters/controllers/plan/remove-plan-entry.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("removePlanEntryController", () => {
  controllerBasics({
    make: (useCase, logger) => removePlanEntryController(useCase, logger),
    valid: { entryId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { entryId: "x" },
    },
  });
});
