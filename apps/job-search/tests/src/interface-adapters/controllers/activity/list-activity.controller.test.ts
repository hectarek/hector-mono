import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { listActivityController } from "@/src/interface-adapters/controllers/activity/list-activity.controller";
import { OWNER } from "@/tests/_support/app";

// Claude's session, acting on the owner's rows.
const CLAUDE: CurrentActor = { actor: "agent", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async () => ({ entries: [], nextOffset: null }));
  return {
    useCase,
    controller: listActivityController(useCase, new MockLoggerService()),
  };
};

describe("listActivityController", () => {
  it("hands the use case the owner's id and the filter as read: times as dates, the first page by default", async () => {
    const { useCase, controller } = setup();
    await controller(
      { actor: "agent", since: "2026-10-23T09:00:00-04:00" },
      CLAUDE,
    );
    expect(useCase).toHaveBeenCalledWith(OWNER, {
      actor: "agent",
      since: new Date("2026-10-23T13:00:00Z"),
      limit: 20,
      offset: 0,
    });
  });

  it.each([
    {
      label: "a time without its offset",
      input: { since: "2026-10-23T09:00:00" },
    },
    { label: "a page larger than 50", input: { limit: 51 } },
    {
      label: "a record without an id",
      input: { record: { kind: "job", id: "x" } },
    },
    { label: "someone who isn't an actor", input: { actor: "hector" } },
  ])("rejects $label before the use case runs", async ({ input }) => {
    const { useCase, controller } = setup();
    await expect(controller(input, CLAUDE)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
