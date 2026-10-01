import { describe } from "bun:test";
import { clearCheckedItemsController } from "@/src/interface-adapters/controllers/grocery/clear-checked-items.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("clearCheckedItemsController", () => {
  controllerBasics({
    make: (useCase, logger) => clearCheckedItemsController(useCase, logger),
    valid: { spaceId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { spaceId: "x" },
    },
  });
});
