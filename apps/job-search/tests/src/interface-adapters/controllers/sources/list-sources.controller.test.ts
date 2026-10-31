import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { listSourcesController } from "@/src/interface-adapters/controllers/sources/list-sources.controller";
import { OWNER } from "@/tests/_support/app";

describe("listSourcesController", () => {
  it("hands the use case the owner's id", async () => {
    const useCase = mock(async () => []);
    await listSourcesController(useCase, new MockLoggerService())(
      {},
      { actor: "agent", ownerId: OWNER },
    );
    expect(useCase).toHaveBeenCalledWith(OWNER);
  });

  it("rejects input that isn't an object before the use case runs", async () => {
    const useCase = mock(async () => []);
    await expect(
      listSourcesController(useCase, new MockLoggerService())("sources", {
        actor: "agent",
        ownerId: OWNER,
      }),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
