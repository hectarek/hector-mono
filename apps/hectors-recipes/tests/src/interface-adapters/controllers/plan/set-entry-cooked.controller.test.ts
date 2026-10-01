import { describe } from "bun:test";
import { setEntryCookedController } from "@/src/interface-adapters/controllers/plan/set-entry-cooked.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("setEntryCookedController", () => {
  controllerBasics({
    make: (useCase, logger) => setEntryCookedController(useCase, logger),
    valid: { entryId: ID, cooked: true },
    calledWith: [ID, true, OWNER],
    invalid: {
      "a non-boolean cooked": { entryId: ID, cooked: 1 },
    },
  });
});
