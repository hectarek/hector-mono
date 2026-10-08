import { describe, expect, it, mock } from "bun:test";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getReadsLeftController } from "@/src/interface-adapters/controllers/recipes/get-reads-left.controller";
import { OWNER } from "@/tests/_support/app";

describe("getReadsLeftController", () => {
  it("turns away a signed-out user, and asks for the signed-in one's", async () => {
    const useCase = mock(async () => 3);
    const controller = getReadsLeftController(
      useCase as never,
      new MockLoggerService(),
    );

    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(await controller(OWNER)).toBe(3);
    expect(useCase).toHaveBeenCalledWith(OWNER);
  });
});
