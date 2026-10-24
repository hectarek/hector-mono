import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { whoamiController } from "@/src/interface-adapters/controllers/session/whoami.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: CurrentActor = { actor: "agent", ownerId: OWNER };

const setup = () => {
  const useCase = mock(({ actor }: CurrentActor) => ({
    actor,
    today: "2026-10-23",
    toolSetVersion: 1,
  }));
  return {
    useCase,
    controller: whoamiController(useCase, new MockLoggerService()),
  };
};

describe("whoamiController", () => {
  it("hands the use case who's acting", async () => {
    const { useCase, controller } = setup();
    expect(await controller({}, CLAUDE)).toEqual({
      actor: "agent",
      today: "2026-10-23",
      toolSetVersion: 1,
    });
    expect(useCase).toHaveBeenCalledWith(CLAUDE);
  });

  it("rejects input that isn't an object before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(controller("me", CLAUDE)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
