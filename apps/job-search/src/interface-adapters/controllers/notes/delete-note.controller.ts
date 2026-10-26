import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteNoteUseCase } from "@/src/application/use-cases/notes/delete-note.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type NoteRecord,
  noteIdSchema,
} from "@/src/entities/models/note.model";

export type IDeleteNoteController = ReturnType<typeof deleteNoteController>;

// Deleting a note: human-only (R21), so no page tool calls it.
export const deleteNoteController = (
  useCase: IDeleteNoteUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "deleteNote" });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<{ id: string; record: NoteRecord }> => {
    const { data, error: parseError } = noteIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Delete note input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
