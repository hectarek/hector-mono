import { describe } from "bun:test";
import { updateMemberRoleController } from "@/src/interface-adapters/controllers/spaces/update-member-role.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics, ID, ID2 } from "@/tests/_support/controller";

describe("updateMemberRoleController", () => {
  controllerBasics({
    make: (useCase, logger) => updateMemberRoleController(useCase, logger),
    valid: { spaceId: ID, memberId: ID2, role: "editor" },
    calledWith: [ID, ID2, "editor", OWNER],
    invalid: {
      "making someone owner": { spaceId: ID, memberId: ID2, role: "owner" },
    },
  });
});
