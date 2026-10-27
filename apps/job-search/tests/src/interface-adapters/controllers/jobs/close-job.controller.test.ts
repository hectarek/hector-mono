import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { closeJobController } from "@/src/interface-adapters/controllers/jobs/close-job.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "a_tool",
};

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: closeJobController(useCase, new MockLoggerService()),
  };
};

describe("closeJobController", () => {
  it("hands the use case who's closing the job and the closing as read", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        id: "00000000-0000-4000-8000-0000000000c1",
        status: "rejected",
        reason: "No fit",
      },
      CLAUDE,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(CLAUDE, {
      id: "00000000-0000-4000-8000-0000000000c1",
      status: "rejected",
      reason: "No fit",
    });
  });

  it("rejects a closing without a reason before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller(
        { id: "00000000-0000-4000-8000-0000000000c1", status: "rejected" },
        CLAUDE,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
