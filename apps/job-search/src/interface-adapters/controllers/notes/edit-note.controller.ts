import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IEditNoteUseCase } from "@/src/application/use-cases/notes/edit-note.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { editNoteSchema, type Note } from "@/src/entities/models/note.model";

export type IEditNoteController = ReturnType<typeof editNoteController>;

// Editing a note: Hector's alone (R21), so no page tool calls it.
export const editNoteController = (
  useCase: IEditNoteUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "editNote" });

  return async (input: unknown, context: ChangeContext): Promise<Note> => {
    const { data, error: parseError } = editNoteSchema.safeParse(input);
    if (parseError) {
      logger.warn("Edit note input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
