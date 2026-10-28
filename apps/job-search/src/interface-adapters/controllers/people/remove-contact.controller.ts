import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemoveContactUseCase } from "@/src/application/use-cases/people/remove-contact.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { contactSchema } from "@/src/entities/models/person.model";

export type IRemoveContactController = ReturnType<
  typeof removeContactController
>;

// Taking a person off a job's contacts, from the job's page: human-only (R21), so no page tool
// calls it.
export const removeContactController = (
  useCase: IRemoveContactUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removeContact",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<{ personId: string; jobId: string }> => {
    const { data, error: parseError } = contactSchema.safeParse(input);
    if (parseError) {
      logger.warn("Remove contact input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
