import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IGetGameUseCase } from "@/src/application/use-cases/catalog/get-game.use-case";
import type { ISearchGamesUseCase } from "@/src/application/use-cases/catalog/search-games.use-case";
import type { DatabaseProvider } from "@/src/infrastructure/db/database";

export const DI_SYMBOLS = {
  IDatabaseProvider: Symbol.for("IDatabaseProvider"),
  IGamesRepository: Symbol.for("IGamesRepository"),
  ISearchGamesUseCase: Symbol.for("ISearchGamesUseCase"),
  IGetGameUseCase: Symbol.for("IGetGameUseCase"),
};

export interface DI_RETURN_TYPES {
  IDatabaseProvider: DatabaseProvider;
  IGamesRepository: IGamesRepository;
  ISearchGamesUseCase: ISearchGamesUseCase;
  IGetGameUseCase: IGetGameUseCase;
}
