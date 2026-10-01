import { describe } from "bun:test";
import { updateGroceryItemController } from "@/src/interface-adapters/controllers/grocery/update-grocery-item.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("updateGroceryItemController", () => {
  controllerBasics({
    make: (useCase, logger) => updateGroceryItemController(useCase, logger),
    valid: { itemId: ID, text: " Oat milk " },
    calledWith: [ID, "Oat milk", OWNER],
    invalid: {
      "blank text": { itemId: ID, text: "   " },
      "text over 200 characters": { itemId: ID, text: "x".repeat(201) },
      "a malformed id": { itemId: "nope", text: "Milk" },
    },
  });
});
