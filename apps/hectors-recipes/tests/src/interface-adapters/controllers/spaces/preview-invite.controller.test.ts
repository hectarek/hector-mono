import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { previewInviteController } from "@/src/interface-adapters/controllers/spaces/preview-invite.controller";
import { OWNER } from "@/tests/_support/app";

// Unlike the other controllers (tests/_support/controller.ts), this one works signed out:
// the welcome screen names the space an invite link is for before anyone has an account.
describe("previewInviteController", () => {
  const setup = () => {
    const useCase = mock(async () => undefined);
    return {
      useCase,
      controller: previewInviteController(
        useCase as never,
        new MockLoggerService(),
      ),
    };
  };

  it("previews for a signed-out visitor", async () => {
    const { useCase, controller } = setup();
    await controller({ token: "abcdefgh12" }, undefined);
    expect(useCase).toHaveBeenCalledWith("abcdefgh12", undefined);
  });

  it("passes the signed-in user on", async () => {
    const { useCase, controller } = setup();
    await controller({ token: "abcdefgh12" }, OWNER);
    expect(useCase).toHaveBeenCalledWith("abcdefgh12", OWNER);
  });

  it("rejects a too-short token", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller({ token: "abc" }, undefined),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
