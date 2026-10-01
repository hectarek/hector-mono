import { describe } from "bun:test";
import { removeMemberController } from "@/src/interface-adapters/controllers/spaces/remove-member.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID, ID2 } from "@/tests/_support/controller";

describe("removeMemberController", () => {
  controllerBasics({
    make: (useCase, logger) => removeMemberController(useCase, logger),
    valid: { spaceId: ID, memberId: ID2 },
    calledWith: [ID, ID2, OWNER],
    invalid: {
      "no member": { spaceId: ID },
    },
  });
});
