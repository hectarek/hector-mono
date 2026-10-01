import { describe } from "bun:test";
import { createInviteController } from "@/src/interface-adapters/controllers/spaces/create-invite.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("createInviteController", () => {
  controllerBasics({
    make: (useCase, logger) => createInviteController(useCase, logger),
    valid: { spaceId: ID, role: "viewer" },
    calledWith: [ID, "viewer", OWNER],
    invalid: {
      "an owner invite": { spaceId: ID, role: "owner" },
    },
  });
});
