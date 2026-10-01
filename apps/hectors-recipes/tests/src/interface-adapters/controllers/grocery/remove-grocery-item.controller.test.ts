import { describe } from "bun:test";
import { removeGroceryItemController } from "@/src/interface-adapters/controllers/grocery/remove-grocery-item.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("removeGroceryItemController", () => {
  controllerBasics({
    make: (useCase, logger) => removeGroceryItemController(useCase, logger),
    valid: { itemId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { itemId: "x" },
    },
  });
});
