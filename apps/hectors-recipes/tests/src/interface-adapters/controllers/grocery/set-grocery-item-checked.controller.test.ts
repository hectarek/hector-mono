import { describe } from "bun:test";
import { setGroceryItemCheckedController } from "@/src/interface-adapters/controllers/grocery/set-grocery-item-checked.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("setGroceryItemCheckedController", () => {
  controllerBasics({
    make: (useCase, logger) => setGroceryItemCheckedController(useCase, logger),
    valid: { itemId: ID, checked: true },
    calledWith: [ID, true, OWNER],
    invalid: {
      "a non-boolean checked": { itemId: ID, checked: "yes" },
    },
  });
});
