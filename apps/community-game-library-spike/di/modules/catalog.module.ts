import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { getGameUseCase } from "@/src/application/use-cases/catalog/get-game.use-case";
import { searchGamesUseCase } from "@/src/application/use-cases/catalog/search-games.use-case";
import { GamesRepository } from "@/src/infrastructure/repositories/games.repository";
import { getDatabase } from "@/src/server/db";

export function createCatalogModule() {
  const catalogModule = createModule();

  catalogModule.bind(DI_SYMBOLS.IDatabaseProvider).toValue(getDatabase);
  catalogModule
    .bind(DI_SYMBOLS.IGamesRepository)
    .toClass(GamesRepository, [DI_SYMBOLS.IDatabaseProvider]);
  catalogModule
    .bind(DI_SYMBOLS.ISearchGamesUseCase)
    .toHigherOrderFunction(searchGamesUseCase, [DI_SYMBOLS.IGamesRepository]);
  catalogModule
    .bind(DI_SYMBOLS.IGetGameUseCase)
    .toHigherOrderFunction(getGameUseCase, [DI_SYMBOLS.IGamesRepository]);

  return catalogModule;
}
