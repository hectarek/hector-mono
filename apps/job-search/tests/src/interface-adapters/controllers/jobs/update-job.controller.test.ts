import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { updateJobController } from "@/src/interface-adapters/controllers/jobs/update-job.controller";
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
    controller: updateJobController(useCase, new MockLoggerService()),
  };
};

describe("updateJobController", () => {
  it("hands the use case who's changing the job and the change as read", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        id: "00000000-0000-4000-8000-0000000000c1",
        updatedAt: "2026-10-26T15:00:00.123Z",
        location: "Springfield",
      },
      CLAUDE,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(CLAUDE, {
      id: "00000000-0000-4000-8000-0000000000c1",
      updatedAt: new Date("2026-10-26T15:00:00.123Z"),
      location: "Springfield",
    });
  });

  it("rejects a change without the updatedAt read before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller(
        { id: "00000000-0000-4000-8000-0000000000c1", location: "Springfield" },
        CLAUDE,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
