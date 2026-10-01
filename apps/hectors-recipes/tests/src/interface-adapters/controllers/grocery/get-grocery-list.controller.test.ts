import { describe } from "bun:test";
import { getGroceryListController } from "@/src/interface-adapters/controllers/grocery/get-grocery-list.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("getGroceryListController", () => {
  controllerBasics({
    make: (useCase, logger) => getGroceryListController(useCase, logger),
    valid: { spaceId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { spaceId: "x" },
    },
  });
});
