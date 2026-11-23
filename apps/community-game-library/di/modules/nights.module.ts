import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { createNightUseCase } from "@/src/application/use-cases/nights/create-night.use-case";
import { getNightUseCase } from "@/src/application/use-cases/nights/get-night.use-case";
import { getNightGameChoicesUseCase } from "@/src/application/use-cases/nights/get-night-game-choices.use-case";
import { listNightsUseCase } from "@/src/application/use-cases/nights/list-nights.use-case";
import { updateNightUseCase } from "@/src/application/use-cases/nights/update-night.use-case";
import { GameNightsRepository } from "@/src/infrastructure/repositories/game-nights.repository";
import { MockGameNightsRepository } from "@/src/infrastructure/repositories/game-nights.repository.mock";
import { createNightController } from "@/src/interface-adapters/controllers/nights/create-night.controller";
import { getNightController } from "@/src/interface-adapters/controllers/nights/get-night.controller";
import { getNightGameChoicesController } from "@/src/interface-adapters/controllers/nights/get-night-game-choices.controller";
import { listNightsController } from "@/src/interface-adapters/controllers/nights/list-nights.controller";
import { updateNightController } from "@/src/interface-adapters/controllers/nights/update-night.controller";

// Game nights (R29 to R39): U17's daily run reads who's going; U18 makes, edits and reads them.
export function createNightsModule() {
  const nightsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    nightsModule
      .bind(DI_SYMBOLS.IGameNightsRepository)
      .toClass(MockGameNightsRepository, [DI_SYMBOLS.IFriendshipsRepository]);
  } else {
    nightsModule
      .bind(DI_SYMBOLS.IGameNightsRepository)
      .toClass(GameNightsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const {
    IFriendshipsRepository: friendships,
    IGameNightsRepository: gameNights,
    IGamesRepository: games,
    ILoansRepository: loans,
    ILoggerService: log,
    INoticesRepository: notices,
    ITransactionManagerService: transactions,
    IUserGamesRepository: userGames,
    IUserProfilesRepository: profiles,
  } = DI_SYMBOLS;

  nightsModule
    .bind(DI_SYMBOLS.ICreateNightUseCase)
    .toHigherOrderFunction(createNightUseCase, [
      userGames,
      gameNights,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.ICreateNightController)
    .toHigherOrderFunction(createNightController, [
      DI_SYMBOLS.ICreateNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IUpdateNightUseCase)
    .toHigherOrderFunction(updateNightUseCase, [
      friendships,
      gameNights,
      notices,
      transactions,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IUpdateNightController)
    .toHigherOrderFunction(updateNightController, [
      DI_SYMBOLS.IUpdateNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IListNightsUseCase)
    .toHigherOrderFunction(listNightsUseCase, [gameNights, profiles]);
  nightsModule
    .bind(DI_SYMBOLS.IListNightsController)
    .toHigherOrderFunction(listNightsController, [
      DI_SYMBOLS.IListNightsUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetNightUseCase)
    .toHigherOrderFunction(getNightUseCase, [
      friendships,
      gameNights,
      userGames,
      games,
      profiles,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetNightController)
    .toHigherOrderFunction(getNightController, [
      DI_SYMBOLS.IGetNightUseCase,
      log,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetNightGameChoicesUseCase)
    .toHigherOrderFunction(getNightGameChoicesUseCase, [
      userGames,
      games,
      loans,
      profiles,
    ]);
  nightsModule
    .bind(DI_SYMBOLS.IGetNightGameChoicesController)
    .toHigherOrderFunction(getNightGameChoicesController, [
      DI_SYMBOLS.IGetNightGameChoicesUseCase,
      log,
    ]);

  return nightsModule;
}
