import { describe, expect, it, mock } from "bun:test";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { listWaysInController } from "@/src/interface-adapters/controllers/account/list-ways-in.controller";
import { CAST } from "@/tests/_support/cast";

const { you } = CAST.people;

describe("how the signed-in member signs in (E5)", () => {
  it("listWaysIn turns away a signed-out user, and reads only the member's own", async () => {
    const useCase = mock(async () => []);
    const controller = listWaysInController(
      useCase as never,
      new MockLoggerService(),
    );
    await expect(controller(undefined)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
    expect(useCase).not.toHaveBeenCalled();
    await controller(you.id);
    expect(useCase).toHaveBeenCalledWith(you.id);
  });
});
