import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeletePracticeEntryUseCase } from "@/src/application/use-cases/practice/delete-practice-entry.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type DeletedPracticeEntry,
  practiceEntryIdSchema,
} from "@/src/entities/models/practice-entry.model";

export type IDeletePracticeEntryController = ReturnType<
  typeof deletePracticeEntryController
>;

// Deleting a session or a review, from the session's page: human-only (R21), so no page tool calls
// it.
export const deletePracticeEntryController = (
  useCase: IDeletePracticeEntryUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deletePracticeEntry",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<DeletedPracticeEntry> => {
    const { data, error: parseError } = practiceEntryIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Delete practice entry input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
