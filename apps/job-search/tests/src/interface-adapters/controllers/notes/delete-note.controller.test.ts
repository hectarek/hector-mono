import { describe, expect, it, mock } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { deleteNoteController } from "@/src/interface-adapters/controllers/notes/delete-note.controller";
import { OWNER } from "@/tests/_support/app";

const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

const setup = () => {
  const useCase = mock(async (): Promise<never> => {
    throw new Error("not reached");
  });
  return {
    useCase,
    controller: deleteNoteController(useCase, new MockLoggerService()),
  };
};

describe("deleteNoteController", () => {
  it("hands the use case who's deleting and which note", async () => {
    const { useCase, controller } = setup();
    await controller(
      { id: "00000000-0000-4000-8000-0000000000c1" },
      HECTOR,
    ).catch(() => {});
    expect(useCase).toHaveBeenCalledWith(HECTOR, {
      id: "00000000-0000-4000-8000-0000000000c1",
    });
  });

  it("rejects a malformed id before the use case runs", async () => {
    const { useCase, controller } = setup();
    await expect(controller({ id: "x" }, HECTOR)).rejects.toBeInstanceOf(
      InputParseError,
    );
    expect(useCase).not.toHaveBeenCalled();
  });
});
