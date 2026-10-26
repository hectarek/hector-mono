import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { updateSettingsController } from "@/src/interface-adapters/controllers/settings/update-settings.controller";
import { OWNER } from "@/tests/_support/app";

const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

const TARGETS = {
  messagesSent: 10,
  conversationsHeld: 2,
  applications: 5,
  practiceSessions: null,
  screensReached: 0,
};

const setup = () => {
  const useCase = mock(async () => DEFAULT_SETTINGS);
  return {
    useCase,
    controller: updateSettingsController(useCase, new MockLoggerService()),
  };
};

describe("updateSettingsController", () => {
  it("hands the use case who's saving and the settings as read, the time read as a date", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        targets: TARGETS,
        pendingCap: 8,
        updatedAt: "2026-10-26T15:00:00.123Z",
      },
      HECTOR,
    );
    expect(useCase).toHaveBeenCalledWith(HECTOR, {
      targets: TARGETS,
      pendingCap: 8,
      updatedAt: new Date("2026-10-26T15:00:00.123Z"),
    });
  });

  it.each([
    {
      label: "a target below 0",
      input: { targets: { ...TARGETS, applications: -1 }, pendingCap: 8 },
    },
    { label: "a queue cap of 0", input: { targets: TARGETS, pendingCap: 0 } },
    {
      label: "a target missing",
      input: { targets: { messagesSent: 1 }, pendingCap: 8 },
    },
  ])("rejects $label before the use case runs", async ({ input }) => {
    const { useCase, controller } = setup();
    await expect(
      controller({ ...input, updatedAt: null }, HECTOR),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
