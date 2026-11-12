import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { findJobsController } from "@/src/interface-adapters/controllers/jobs/find-jobs.controller";
import { OWNER } from "@/tests/_support/app";

// Claude's session, acting on the owner's rows.
const CLAUDE_READING: CurrentActor = { actor: "agent", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: findJobsController(useCase, new MockLoggerService()),
  };
};

describe("findJobsController", () => {
  it("hands the use case the owner's id and the query as read, a page of 20 by default", async () => {
    const { useCase, controller } = setup();
    await controller({ status: "to-apply" }, CLAUDE_READING).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(OWNER, {
      status: "to-apply",
      limit: 20,
      offset: 0,
    });
  });

  it("rejects a status that isn't one before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller({ status: "maybe" }, CLAUDE_READING),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
