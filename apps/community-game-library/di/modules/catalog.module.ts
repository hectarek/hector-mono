import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { getGameUseCase } from "@/src/application/use-cases/catalog/get-game.use-case";
import { searchGamesUseCase } from "@/src/application/use-cases/catalog/search-games.use-case";
import { GamesRepository } from "@/src/infrastructure/repositories/games.repository";
import { MockGamesRepository } from "@/src/infrastructure/repositories/games.repository.mock";
import { getGameController } from "@/src/interface-adapters/controllers/catalog/get-game.controller";
import { searchGamesController } from "@/src/interface-adapters/controllers/catalog/search-games.controller";

export function createCatalogModule() {
  const catalogModule = createModule();

  if (process.env.NODE_ENV === "test") {
    catalogModule
      .bind(DI_SYMBOLS.IGamesRepository)
      .toClass(MockGamesRepository);
  } else {
    catalogModule
      .bind(DI_SYMBOLS.IGamesRepository)
      .toClass(GamesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  // A game's page and search read the same four repositories.
  const reads = [
    DI_SYMBOLS.IGamesRepository,
    DI_SYMBOLS.IUserGamesRepository,
    DI_SYMBOLS.ILoansRepository,
    DI_SYMBOLS.IUserProfilesRepository,
  ];
  catalogModule
    .bind(DI_SYMBOLS.IGetGameUseCase)
    .toHigherOrderFunction(getGameUseCase, reads);
  catalogModule
    .bind(DI_SYMBOLS.ISearchGamesUseCase)
    .toHigherOrderFunction(searchGamesUseCase, reads);

  catalogModule
    .bind(DI_SYMBOLS.IGetGameController)
    .toHigherOrderFunction(getGameController, [
      DI_SYMBOLS.IGetGameUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);
  catalogModule
    .bind(DI_SYMBOLS.ISearchGamesController)
    .toHigherOrderFunction(searchGamesController, [
      DI_SYMBOLS.ISearchGamesUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return catalogModule;
}
