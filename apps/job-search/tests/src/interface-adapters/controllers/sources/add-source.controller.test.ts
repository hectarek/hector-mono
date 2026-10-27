import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { addSourceController } from "@/src/interface-adapters/controllers/sources/add-source.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "add_source",
};

const setup = () => {
  const useCase = mock(async () => ({
    source: { id: "00000000-0000-4000-8000-0000000000d1", name: "Widget Jobs" },
    created: true,
  }));
  return {
    useCase,
    controller: addSourceController(useCase, new MockLoggerService()),
  };
};

describe("addSourceController", () => {
  it("hands the use case who's adding and the name as read", async () => {
    const { useCase, controller } = setup();
    await controller({ name: " Widget  Jobs " }, CLAUDE);
    expect(useCase).toHaveBeenCalledWith(CLAUDE, { name: "Widget Jobs" });
  });

  it("rejects a blank name before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(controller({ name: "" }, CLAUDE)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
