import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getJobController } from "@/src/interface-adapters/controllers/jobs/get-job.controller";
import { OWNER } from "@/tests/_support/app";

// Claude's session, acting on the owner's rows.
const CLAUDE_READING: CurrentActor = { actor: "agent", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: getJobController(useCase, new MockLoggerService()),
  };
};

describe("getJobController", () => {
  it("hands the use case the owner's id and the job's", async () => {
    const { useCase, controller } = setup();
    await controller(
      { id: "00000000-0000-4000-8000-0000000000c1" },
      CLAUDE_READING,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(OWNER, {
      id: "00000000-0000-4000-8000-0000000000c1",
    });
  });

  it("rejects a malformed id before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller({ id: "x" }, CLAUDE_READING),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
