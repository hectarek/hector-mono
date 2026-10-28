import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdatePersonUseCase } from "@/src/application/use-cases/people/update-person.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Person,
  updatePersonSchema,
} from "@/src/entities/models/person.model";

export type IUpdatePersonController = ReturnType<typeof updatePersonController>;

// update_person's write, and the person form's (docs/build-plan.md KTD4).
export const updatePersonController = (
  useCase: IUpdatePersonUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updatePerson",
  });

  return async (input: unknown, context: ChangeContext): Promise<Person> => {
    const { data, error: parseError } = updatePersonSchema.safeParse(input);
    if (parseError) {
      logger.warn("update_person input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid person", { cause: parseError });
    }
    return useCase(context, data);
  };
};
