import { describe, expect, it, mock } from "bun:test";
import { NotAllowedError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { archiveExpiredController } from "@/src/interface-adapters/controllers/jobs/archive-expired.controller";
import { OWNER } from "@/tests/_support/app";

const setup = (ownerUserId?: string) => {
  const useCase = mock(async () => ({ archived: [] }));
  return {
    useCase,
    controller: archiveExpiredController(
      useCase,
      { ownerUserId, agentUserId: undefined },
      new MockLoggerService(),
    ),
  };
};

describe("archiveExpiredController", () => {
  it("runs for the owner the environment names", async () => {
    const { useCase, controller } = setup(OWNER);

    expect(await controller()).toEqual({ archived: [] });
    expect(useCase).toHaveBeenCalledWith(OWNER);
  });

  // KTD2: a missing or malformed id acts for no one.
  it("does nothing without a well-formed owner id", async () => {
    for (const ownerUserId of [undefined, "not-a-uuid"]) {
      const { useCase, controller } = setup(ownerUserId);

      await expect(controller()).rejects.toBeInstanceOf(NotAllowedError);
      expect(useCase).not.toHaveBeenCalled();
    }
  });
});
