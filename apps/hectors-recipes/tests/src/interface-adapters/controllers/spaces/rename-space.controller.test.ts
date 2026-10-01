import { describe } from "bun:test";
import { renameSpaceController } from "@/src/interface-adapters/controllers/spaces/rename-space.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("renameSpaceController", () => {
  controllerBasics({
    make: (useCase, logger) => renameSpaceController(useCase, logger),
    valid: { spaceId: ID, name: " Kitchen " },
    calledWith: [ID, "Kitchen", OWNER],
    invalid: {
      "a blank name": { spaceId: ID, name: " " },
      "more than 80 characters": { spaceId: ID, name: "x".repeat(81) },
    },
  });
});
