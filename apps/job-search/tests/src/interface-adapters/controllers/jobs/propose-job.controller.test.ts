import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { proposeJobController } from "@/src/interface-adapters/controllers/jobs/propose-job.controller";
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
    controller: proposeJobController(useCase, new MockLoggerService()),
  };
};

describe("proposeJobController", () => {
  it("hands the use case who's proposing and the proposal as read", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        companyId: "00000000-0000-4000-8000-0000000000c2",
        role: " Widget engineer ",
        postingUrl: "https://boards.greenhouse.io/acme/jobs/4001",
        source: "Widget Jobs",
        reason: "Matches the target role",
      },
      CLAUDE,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(CLAUDE, {
      companyId: "00000000-0000-4000-8000-0000000000c2",
      role: "Widget engineer",
      postingUrl: "https://boards.greenhouse.io/acme/jobs/4001",
      source: "Widget Jobs",
      reason: "Matches the target role",
    });
  });

  it("rejects a proposal without its reason before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller(
        {
          companyId: "00000000-0000-4000-8000-0000000000c2",
          role: "Widget engineer",
          postingUrl: "https://boards.greenhouse.io/acme/jobs/4001",
          source: "Widget Jobs",
        },
        CLAUDE,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
