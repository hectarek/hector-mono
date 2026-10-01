import { describe } from "bun:test";
import { acceptInviteController } from "@/src/interface-adapters/controllers/spaces/accept-invite.controller";
import { OWNER } from "@/tests/_support/app";
import { controllerBasics } from "@/tests/_support/controller";

describe("acceptInviteController", () => {
  controllerBasics({
    make: (useCase, logger) => acceptInviteController(useCase, logger),
    valid: { token: "abcdefgh12", makeDefault: true },
    calledWith: ["abcdefgh12", OWNER, { makeDefault: true }],
    invalid: {
      "a too-short token": { token: "abc" },
      "a makeDefault that isn't true or false": {
        token: "abcdefgh12",
        makeDefault: "yes",
      },
    },
  });
});
