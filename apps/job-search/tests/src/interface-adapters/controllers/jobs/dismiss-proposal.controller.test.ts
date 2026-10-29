import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { dismissProposalController } from "@/src/interface-adapters/controllers/jobs/dismiss-proposal.controller";
import { OWNER } from "@/tests/_support/app";

const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: dismissProposalController(useCase, new MockLoggerService()),
  };
};

describe("dismissProposalController", () => {
  it("hands the use case who's deciding, and a dismissal with its reason", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        id: "00000000-0000-4000-8000-0000000000c1",
        updatedAt: "2026-10-26T16:00:00.000Z",
        reason: "other",
      },
      HECTOR,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(HECTOR, {
      id: "00000000-0000-4000-8000-0000000000c1",
      updatedAt: new Date("2026-10-26T16:00:00.000Z"),
      decision: "dismiss",
      reason: "other",
      note: null,
    });
  });

  it("rejects a reason that isn't one before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller(
        { id: "00000000-0000-4000-8000-0000000000c1", reason: "bored" },
        HECTOR,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
