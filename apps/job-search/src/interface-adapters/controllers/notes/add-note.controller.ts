import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddNoteUseCase } from "@/src/application/use-cases/notes/add-note.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { addNoteSchema, type Note } from "@/src/entities/models/note.model";

export type IAddNoteController = ReturnType<typeof addNoteController>;

// add_note's write, and the note form's: a note only ever appends.
export const addNoteController = (
  useCase: IAddNoteUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "addNote" });

  return async (input: unknown, context: ChangeContext): Promise<Note> => {
    const { data, error: parseError } = addNoteSchema.safeParse(input);
    if (parseError) {
      logger.warn("add_note input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
