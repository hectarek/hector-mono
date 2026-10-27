import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { addNoteController } from "@/src/interface-adapters/controllers/notes/add-note.controller";
import { OWNER } from "@/tests/_support/app";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "a_tool",
};

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: addNoteController(useCase, new MockLoggerService()),
  };
};

describe("addNoteController", () => {
  it("hands the use case who's adding it and the note as read", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        record: { kind: "job", id: "00000000-0000-4000-8000-0000000000c1" },
        body: " A note ",
      },
      CLAUDE,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(CLAUDE, {
      record: { kind: "job", id: "00000000-0000-4000-8000-0000000000c1" },
      body: "A note",
    });
  });

  it("rejects a record that isn't a job before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller(
        {
          record: {
            kind: "person",
            id: "00000000-0000-4000-8000-0000000000c1",
          },
          body: "A note",
        },
        CLAUDE,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
