import { describe } from "bun:test";
import { ensureInviteLinksController } from "@/src/interface-adapters/controllers/spaces/ensure-invite-links.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID } from "@/tests/_support/controller";

describe("ensureInviteLinksController", () => {
  controllerBasics({
    make: (useCase, logger) => ensureInviteLinksController(useCase, logger),
    valid: { spaceId: ID },
    calledWith: [ID, OWNER],
    invalid: {
      "a malformed id": { spaceId: "x" },
    },
  });
});
