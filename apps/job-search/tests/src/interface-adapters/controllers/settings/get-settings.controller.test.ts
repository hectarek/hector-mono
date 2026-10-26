import { describe, expect, it, mock } from "bun:test";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import { getSettingsController } from "@/src/interface-adapters/controllers/settings/get-settings.controller";
import { OWNER } from "@/tests/_support/app";

describe("getSettingsController", () => {
  it("hands the use case the owner's id", async () => {
    const useCase = mock(async () => DEFAULT_SETTINGS);
    await getSettingsController(useCase)({ actor: "agent", ownerId: OWNER });
    expect(useCase).toHaveBeenCalledWith(OWNER);
  });
});
