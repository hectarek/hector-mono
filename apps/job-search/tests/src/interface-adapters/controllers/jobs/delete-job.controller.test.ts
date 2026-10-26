import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { deleteJobController } from "@/src/interface-adapters/controllers/jobs/delete-job.controller";
import { OWNER } from "@/tests/_support/app";

const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: deleteJobController(useCase, new MockLoggerService()),
  };
};

describe("deleteJobController", () => {
  it("hands the use case who's deleting and which job", async () => {
    const { useCase, controller } = setup();
    await controller(
      { id: "00000000-0000-4000-8000-0000000000c1" },
      HECTOR,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(HECTOR, {
      id: "00000000-0000-4000-8000-0000000000c1",
    });
  });

  it("rejects a malformed id before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(controller({ id: "x" }, HECTOR)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
