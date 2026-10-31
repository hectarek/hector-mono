import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getSettingsController } from "@/src/interface-adapters/controllers/settings/get-settings.controller";
import { OWNER } from "@/tests/_support/app";

describe("getSettingsController", () => {
  it("hands the use case the owner's id", async () => {
    const useCase = mock(async () => DEFAULT_SETTINGS);
    await getSettingsController(useCase, new MockLoggerService())(
      {},
      { actor: "agent", ownerId: OWNER },
    );
    expect(useCase).toHaveBeenCalledWith(OWNER);
  });

  it("rejects input that isn't an object before the use case runs", async () => {
    const useCase = mock(async () => DEFAULT_SETTINGS);
    await expect(
      getSettingsController(useCase, new MockLoggerService())("settings", {
        actor: "agent",
        ownerId: OWNER,
      }),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
