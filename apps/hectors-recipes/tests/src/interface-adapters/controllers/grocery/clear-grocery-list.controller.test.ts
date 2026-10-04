import { describe } from "bun:test";
import { clearGroceryListController } from "@/src/interface-adapters/controllers/grocery/clear-grocery-list.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("clearGroceryListController", () => {
  controllerBasics({
    make: (useCase, logger) => clearGroceryListController(useCase, logger),
    valid: { spaceId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { spaceId: "x" },
    },
  });
});
