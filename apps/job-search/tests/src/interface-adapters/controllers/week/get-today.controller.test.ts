import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { getTodayController } from "@/src/interface-adapters/controllers/week/get-today.controller";
import { OWNER } from "@/tests/_support/app";

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: getTodayController(useCase, new MockLoggerService()),
  };
};

describe("getTodayController", () => {
  it("hands the use case the owner's id, whoever is reading", async () => {
    const { useCase, controller } = setup();
    await controller({}, { actor: "agent", ownerId: OWNER }).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(OWNER);
  });

  it("rejects input that isn't an object before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller("today", { actor: "owner", ownerId: OWNER }),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
