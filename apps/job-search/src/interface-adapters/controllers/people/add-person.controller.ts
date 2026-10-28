import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddPersonUseCase } from "@/src/application/use-cases/people/add-person.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  addPersonSchema,
  type Person,
} from "@/src/entities/models/person.model";

export type IAddPersonController = ReturnType<typeof addPersonController>;

// add_person's write, and the person form's (docs/build-plan.md KTD4): who is acting, and the tool,
// are already settled by the action.
export const addPersonController = (
  useCase: IAddPersonUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addPerson",
  });

  return async (input: unknown, context: ChangeContext): Promise<Person> => {
    const { data, error: parseError } = addPersonSchema.safeParse(input);
    if (parseError) {
      logger.warn("add_person input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid person", { cause: parseError });
    }
    return useCase(context, data);
  };
};
