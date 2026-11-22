import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addGameUseCase } from "@/src/application/use-cases/suggestions/add-game.use-case";
import { answerSuggestionUseCase } from "@/src/application/use-cases/suggestions/answer-suggestion.use-case";
import { findGamesToEditUseCase } from "@/src/application/use-cases/suggestions/find-games-to-edit.use-case";
import { getGameToEditUseCase } from "@/src/application/use-cases/suggestions/get-game-to-edit.use-case";
import { getSuggestionUseCase } from "@/src/application/use-cases/suggestions/get-suggestion.use-case";
import { listAnsweredSuggestionsUseCase } from "@/src/application/use-cases/suggestions/list-answered-suggestions.use-case";
import { listSuggestionsUseCase } from "@/src/application/use-cases/suggestions/list-suggestions.use-case";
import { suggestGameUseCase } from "@/src/application/use-cases/suggestions/suggest-game.use-case";
import { updateGameUseCase } from "@/src/application/use-cases/suggestions/update-game.use-case";
import { GameSuggestionsRepository } from "@/src/infrastructure/repositories/game-suggestions.repository";
import { MockGameSuggestionsRepository } from "@/src/infrastructure/repositories/game-suggestions.repository.mock";
import { addGameController } from "@/src/interface-adapters/controllers/suggestions/add-game.controller";
import { answerSuggestionController } from "@/src/interface-adapters/controllers/suggestions/answer-suggestion.controller";
import { findGamesToEditController } from "@/src/interface-adapters/controllers/suggestions/find-games-to-edit.controller";
import { getGameToEditController } from "@/src/interface-adapters/controllers/suggestions/get-game-to-edit.controller";
import { getSuggestionController } from "@/src/interface-adapters/controllers/suggestions/get-suggestion.controller";
import { listAnsweredSuggestionsController } from "@/src/interface-adapters/controllers/suggestions/list-answered-suggestions.controller";
import { listSuggestionsController } from "@/src/interface-adapters/controllers/suggestions/list-suggestions.controller";
import { suggestGameController } from "@/src/interface-adapters/controllers/suggestions/suggest-game.controller";
import { updateGameController } from "@/src/interface-adapters/controllers/suggestions/update-game.controller";

// Suggestions (B9) and the admin's catalog (G1 to G5, G7; U9).
export function createSuggestionsModule() {
  const suggestionsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    suggestionsModule
      .bind(DI_SYMBOLS.IGameSuggestionsRepository)
      .toClass(MockGameSuggestionsRepository);
  } else {
    suggestionsModule
      .bind(DI_SYMBOLS.IGameSuggestionsRepository)
      .toClass(GameSuggestionsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const {
    AdminAccount: admin,
    IFileStorage: files,
    IGameSuggestionsRepository: suggestions,
    IGamesRepository: games,
    ILoggerService: log,
    INoticesRepository: notices,
    IRequireAdmin: requireAdmin,
    ITransactionManagerService: transactions,
    IUserGamesRepository: userGames,
    IUserProfilesRepository: profiles,
    IUserSettingsRepository: settings,
  } = DI_SYMBOLS;

  suggestionsModule
    .bind(DI_SYMBOLS.IAddGameUseCase)
    .toHigherOrderFunction(addGameUseCase, [
      requireAdmin,
      games,
      suggestions,
      userGames,
      settings,
      notices,
      files,
      transactions,
      log,
    ]);
  suggestionsModule
    .bind(DI_SYMBOLS.IAnswerSuggestionUseCase)
    .toHigherOrderFunction(answerSuggestionUseCase, [
      requireAdmin,
      suggestions,
      games,
      userGames,
      settings,
      notices,
      transactions,
      log,
    ]);
  suggestionsModule
    .bind(DI_SYMBOLS.IFindGamesToEditUseCase)
    .toHigherOrderFunction(findGamesToEditUseCase, [requireAdmin, games]);
  suggestionsModule
    .bind(DI_SYMBOLS.IGetGameToEditUseCase)
    .toHigherOrderFunction(getGameToEditUseCase, [requireAdmin, games]);
  suggestionsModule
    .bind(DI_SYMBOLS.IGetSuggestionUseCase)
    .toHigherOrderFunction(getSuggestionUseCase, [
      requireAdmin,
      suggestions,
      profiles,
      games,
    ]);
  suggestionsModule
    .bind(DI_SYMBOLS.IListAnsweredSuggestionsUseCase)
    .toHigherOrderFunction(listAnsweredSuggestionsUseCase, [
      requireAdmin,
      suggestions,
      profiles,
      games,
    ]);
  suggestionsModule
    .bind(DI_SYMBOLS.IListSuggestionsUseCase)
    .toHigherOrderFunction(listSuggestionsUseCase, [
      requireAdmin,
      suggestions,
      profiles,
    ]);
  suggestionsModule
    .bind(DI_SYMBOLS.ISuggestGameUseCase)
    .toHigherOrderFunction(suggestGameUseCase, [
      suggestions,
      notices,
      files,
      transactions,
      admin,
      log,
    ]);
  suggestionsModule
    .bind(DI_SYMBOLS.IUpdateGameUseCase)
    .toHigherOrderFunction(updateGameUseCase, [
      requireAdmin,
      games,
      files,
      transactions,
      log,
    ]);

  // Each controller takes its use case and the logger.
  const controllers = [
    [
      DI_SYMBOLS.IAddGameController,
      addGameController,
      DI_SYMBOLS.IAddGameUseCase,
    ],
    [
      DI_SYMBOLS.IAnswerSuggestionController,
      answerSuggestionController,
      DI_SYMBOLS.IAnswerSuggestionUseCase,
    ],
    [
      DI_SYMBOLS.IFindGamesToEditController,
      findGamesToEditController,
      DI_SYMBOLS.IFindGamesToEditUseCase,
    ],
    [
      DI_SYMBOLS.IGetGameToEditController,
      getGameToEditController,
      DI_SYMBOLS.IGetGameToEditUseCase,
    ],
    [
      DI_SYMBOLS.IGetSuggestionController,
      getSuggestionController,
      DI_SYMBOLS.IGetSuggestionUseCase,
    ],
    [
      DI_SYMBOLS.IListAnsweredSuggestionsController,
      listAnsweredSuggestionsController,
      DI_SYMBOLS.IListAnsweredSuggestionsUseCase,
    ],
    [
      DI_SYMBOLS.IListSuggestionsController,
      listSuggestionsController,
      DI_SYMBOLS.IListSuggestionsUseCase,
    ],
    [
      DI_SYMBOLS.ISuggestGameController,
      suggestGameController,
      DI_SYMBOLS.ISuggestGameUseCase,
    ],
    [
      DI_SYMBOLS.IUpdateGameController,
      updateGameController,
      DI_SYMBOLS.IUpdateGameUseCase,
    ],
  ] as const;
  for (const [symbol, controller, useCase] of controllers) {
    suggestionsModule
      .bind(symbol)
      .toHigherOrderFunction(controller, [useCase, log]);
  }

  return suggestionsModule;
}
