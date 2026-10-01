import { describe } from "bun:test";
import { getSpaceSettingsController } from "@/src/interface-adapters/controllers/spaces/get-space-settings.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("getSpaceSettingsController", () => {
  controllerBasics({
    make: (useCase, logger) => getSpaceSettingsController(useCase, logger),
    valid: { spaceId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { spaceId: "x" },
    },
  });
});
