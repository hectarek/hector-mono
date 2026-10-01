import { describe } from "bun:test";
import { deleteSpaceController } from "@/src/interface-adapters/controllers/spaces/delete-space.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("deleteSpaceController", () => {
  controllerBasics({
    make: (useCase, logger) => deleteSpaceController(useCase, logger),
    valid: { spaceId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { spaceId: "x" },
    },
  });
});
