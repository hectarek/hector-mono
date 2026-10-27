import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { setJobStatusController } from "@/src/interface-adapters/controllers/jobs/set-job-status.controller";
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
    controller: setJobStatusController(useCase, new MockLoggerService()),
  };
};

describe("setJobStatusController", () => {
  it("hands the use case who's moving the job and the move as read", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        id: "00000000-0000-4000-8000-0000000000c1",
        status: "screen",
        on: "2026-10-25",
      },
      CLAUDE,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(CLAUDE, {
      id: "00000000-0000-4000-8000-0000000000c1",
      status: "screen",
      on: "2026-10-25",
    });
  });

  it("rejects a closed status before the use case runs", async () => {
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
