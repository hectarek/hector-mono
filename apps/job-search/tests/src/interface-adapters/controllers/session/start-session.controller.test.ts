import { describe, expect, it, mock } from "bun:test";
import type { IStartSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { startSessionController } from "@/src/interface-adapters/controllers/session/start-session.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "start_session",
};

const setup = () => {
  const useCase = mock<IStartSessionUseCase>(async () => ({
    session: { id: crypto.randomUUID(), startedAt: new Date() },
    since: null,
    changes: [],
    nextOffset: null,
  }));
  return {
    useCase,
    controller: startSessionController(useCase, new MockLoggerService()),
  };
};

describe("startSessionController", () => {
  it("hands the use case who's starting and the page size, 20 by default", async () => {
    const { useCase, controller } = setup();
    await controller({}, CLAUDE);
    await controller({ limit: 50 }, CLAUDE);
    expect(useCase.mock.calls).toEqual([
      [CLAUDE, { limit: 20 }],
      [CLAUDE, { limit: 50 }],
    ]);
  });

  it.each([
    { label: "a page larger than 50", input: { limit: 51 } },
    { label: "a page size that isn't a number", input: { limit: "all" } },
    { label: "no input at all", input: undefined },
  ])("rejects $label before the use case runs", async ({ input }) => {
    const { useCase, controller } = setup();
    await expect(controller(input, CLAUDE)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
