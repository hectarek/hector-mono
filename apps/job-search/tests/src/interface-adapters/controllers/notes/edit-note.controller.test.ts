import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { editNoteController } from "@/src/interface-adapters/controllers/notes/edit-note.controller";
import { OWNER } from "@/tests/_support/app";

const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: editNoteController(useCase, new MockLoggerService()),
  };
};

describe("editNoteController", () => {
  it("hands the use case who's editing and the edit as read", async () => {
    const { useCase, controller } = setup();
    await controller(
      {
        id: "00000000-0000-4000-8000-0000000000c1",
        updatedAt: "2026-10-26T15:00:00.123Z",
        body: "Edited",
      },
      HECTOR,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(HECTOR, {
      id: "00000000-0000-4000-8000-0000000000c1",
      updatedAt: new Date("2026-10-26T15:00:00.123Z"),
      body: "Edited",
    });
  });

  it("rejects an edit without the updatedAt read before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(
      controller(
        { id: "00000000-0000-4000-8000-0000000000c1", body: "Edited" },
        HECTOR,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(useCase).not.toHaveBeenCalled();
  });
});
