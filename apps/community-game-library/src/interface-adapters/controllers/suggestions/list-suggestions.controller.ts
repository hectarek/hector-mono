import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListSuggestionsUseCase } from "@/src/application/use-cases/suggestions/list-suggestions.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListSuggestionsController = ReturnType<
  typeof listSuggestionsController
>;

// G1's waiting suggestions, for the admin.
export const listSuggestionsController = (
  useCase: IListSuggestionsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listSuggestions",
  });

  return async (userId: string | undefined) => {
    logger.debug("Checking the user", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
