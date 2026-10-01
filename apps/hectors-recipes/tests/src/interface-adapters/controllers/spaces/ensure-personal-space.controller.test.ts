import { describe, expect, it, mock } from "bun:test";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { ensurePersonalSpaceController } from "@/src/interface-adapters/controllers/spaces/ensure-personal-space.controller";
import { OWNER } from "@/tests/_support/app";

describe("ensurePersonalSpaceController", () => {
  const setup = () => {
    const useCase = mock(async () => undefined);
    return {
      useCase,
      controller: ensurePersonalSpaceController(
        useCase as never,
        new MockLoggerService(),
      ),
    };
  };

  it("needs a signed-in user and a known space type", async () => {
    const { useCase, controller } = setup();
    await expect(controller("meal-plan", undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    await expect(controller("plan", OWNER)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });

  it("passes the user and type on", async () => {
    const { useCase, controller } = setup();
    await controller("meal-plan", OWNER);
    expect(useCase).toHaveBeenCalledWith(OWNER, "meal-plan");
  });
});
