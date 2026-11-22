import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import { answerSuggestion } from "@/src/application/use-cases/suggestions/answer-step";
import type {
  GameSuggestion,
  SuggestionAnswer,
} from "@/src/entities/models/game-suggestion.model";

export type IAnswerSuggestionUseCase = ReturnType<
  typeof answerSuggestionUseCase
>;

// G2's It's already here and Decline (R4). Add it by hand is add-game, given the suggestion.
export const answerSuggestionUseCase = (
  requireAdmin: IRequireAdmin,
  gameSuggestionsRepository: IGameSuggestionsRepository,
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  userSettingsRepository: IUserSettingsRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const repositories = {
    gameSuggestions: gameSuggestionsRepository,
    games: gamesRepository,
    userGames: userGamesRepository,
    userSettings: userSettingsRepository,
    notices: noticesRepository,
  };
  const logger = loggerService.child({
    layer: "use-case",
    op: "answerSuggestion",
  });

  return async (
    suggestionId: string,
    answer: Exclude<SuggestionAnswer, { status: "added" }>,
    userId: string,
  ): Promise<GameSuggestion> => {
    requireAdmin(userId);
    return transactionManagerService.startTransaction(async (tx) => {
      const answered = await answerSuggestion(
        repositories,
        suggestionId,
        answer,
        userId,
        tx,
      );
      logger.debug("Answered", { gameSuggestionId: suggestionId });
      return answered;
    });
  };
};
