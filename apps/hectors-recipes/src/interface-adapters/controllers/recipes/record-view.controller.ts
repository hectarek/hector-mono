import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRecordViewUseCase } from "@/src/application/use-cases/recipes/record-view.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { recordViewSchema } from "@/src/entities/models/activity-event.model";

export type IRecordViewController = ReturnType<typeof recordViewController>;

export const recordViewController = (
  recordViewUseCase: IRecordViewUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "recordView",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Recording view", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = recordViewSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return recordViewUseCase(userId, data.recipeId);
  };
};
