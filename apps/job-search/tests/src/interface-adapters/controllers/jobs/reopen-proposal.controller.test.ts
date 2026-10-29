import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { reopenProposalController } from "@/src/interface-adapters/controllers/jobs/reopen-proposal.controller";
import { OWNER } from "@/tests/_support/app";

const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };
const READ = "2026-10-26T16:00:00.000Z";

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: reopenProposalController(useCase, new MockLoggerService()),
  };
};

describe("reopenProposalController", () => {
  it("hands the use case who's deciding, and a reopening against the updatedAt read", async () => {
    const { useCase, controller } = setup();
    await controller(
      { id: "00000000-0000-4000-8000-0000000000c1", updatedAt: READ },
      HECTOR,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(HECTOR, {
      id: "00000000-0000-4000-8000-0000000000c1",
      updatedAt: new Date(READ),
      decision: "reopen",
    });
  });

  it("rejects a malformed id, or no updatedAt, before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller({ id: "x", updatedAt: READ }, HECTOR),
    ).rejects.toBeInstanceOf(InputParseError);
    await expect(
      controller({ id: "00000000-0000-4000-8000-0000000000c1" }, HECTOR),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
