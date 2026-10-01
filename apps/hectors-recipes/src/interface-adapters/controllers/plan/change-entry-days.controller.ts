import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IChangeEntryDaysUseCase } from "@/src/application/use-cases/plan/change-entry-days.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { changeMealDaysSchema } from "@/src/entities/models/plan-entry.model";

export type IChangeEntryDaysController = ReturnType<
  typeof changeEntryDaysController
>;

export const changeEntryDaysController = (
  useCase: IChangeEntryDaysUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "changeEntryDays",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = changeMealDaysSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    const { entryId, ...days } = data;
    return useCase(entryId, days, userId);
  };
};
