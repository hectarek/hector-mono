import { describe } from "bun:test";
import { revokeInviteController } from "@/src/interface-adapters/controllers/spaces/revoke-invite.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("revokeInviteController", () => {
  controllerBasics({
    make: (useCase, logger) => revokeInviteController(useCase, logger),
    valid: { inviteId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { inviteId: "x" },
    },
  });
});
