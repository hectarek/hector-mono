import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { addJobController } from "@/src/interface-adapters/controllers/jobs/add-job.controller";
import { OWNER } from "@/tests/_support/app";

const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: addJobController(useCase, new MockLoggerService()),
  };
};

describe("addJobController", () => {
  it("hands the use case who's adding and the job as read", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        companyId: "00000000-0000-4000-8000-0000000000c2",
        role: "Widget engineer",
        source: "Referral",
      },
      HECTOR,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(HECTOR, {
      companyId: "00000000-0000-4000-8000-0000000000c2",
      role: "Widget engineer",
      source: "Referral",
    });
  });

  it("rejects a malformed company id before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller(
        { companyId: "x", role: "Widget engineer", source: "Referral" },
        HECTOR,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
