import { describe, expect, it, mock } from "bun:test";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getRecentViewsController } from "@/src/interface-adapters/controllers/recipes/get-recent-views.controller";
import { OWNER } from "@/tests/_support/app";

describe("getRecentViewsController", () => {
  it("turns away a signed-out user, and asks for the signed-in one's", async () => {
    const useCase = mock(async () => ["recipe-1"]);
    const controller = getRecentViewsController(
      useCase as never,
      new MockLoggerService(),
    );

    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(await controller(OWNER)).toEqual(["recipe-1"]);
    expect(useCase).toHaveBeenCalledWith(OWNER);
  });
});
