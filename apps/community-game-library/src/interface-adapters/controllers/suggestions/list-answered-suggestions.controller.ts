import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListAnsweredSuggestionsUseCase } from "@/src/application/use-cases/suggestions/list-answered-suggestions.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListAnsweredSuggestionsController = ReturnType<
  typeof listAnsweredSuggestionsController
>;

// G7's answered suggestions, for the admin.
export const listAnsweredSuggestionsController = (
  useCase: IListAnsweredSuggestionsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listAnsweredSuggestions",
  });

  return async (userId: string | undefined) => {
    logger.debug("Checking the user", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
