import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeletePersonUseCase } from "@/src/application/use-cases/people/delete-person.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type DeletedPerson,
  personIdSchema,
} from "@/src/entities/models/person.model";

export type IDeletePersonController = ReturnType<typeof deletePersonController>;

// Deleting a person, from their page: human-only (R21), so no page tool calls it.
export const deletePersonController = (
  useCase: IDeletePersonUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deletePerson",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<DeletedPerson> => {
    const { data, error: parseError } = personIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Delete person input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
