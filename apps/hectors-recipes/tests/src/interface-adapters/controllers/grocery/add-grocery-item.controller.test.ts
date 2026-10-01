import { describe } from "bun:test";
import { addGroceryItemController } from "@/src/interface-adapters/controllers/grocery/add-grocery-item.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("addGroceryItemController", () => {
  controllerBasics({
    make: (useCase, logger) => addGroceryItemController(useCase, logger),
    valid: { spaceId: ID, text: "  Milk  " },
    calledWith: [ID, "Milk", OWNER],
    invalid: {
      "a blank item": { spaceId: ID, text: "   " },
      "more than 200 characters": { spaceId: ID, text: "x".repeat(201) },
      "a malformed list id": { spaceId: "list", text: "Milk" },
    },
  });
});
