import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addUserGameUseCase } from "@/src/application/use-cases/copies/add-user-game.use-case";
import { getUserGameUseCase } from "@/src/application/use-cases/copies/get-user-game.use-case";
import { listLibraryUseCase } from "@/src/application/use-cases/copies/list-library.use-case";
import { listMyLibraryUseCase } from "@/src/application/use-cases/copies/list-my-library.use-case";
import { putInBoxUseCase } from "@/src/application/use-cases/copies/put-in-box.use-case";
import { removeUserGameUseCase } from "@/src/application/use-cases/copies/remove-user-game.use-case";
import { setLendingUseCase } from "@/src/application/use-cases/copies/set-lending.use-case";
import { setPassAlongForAllUseCase } from "@/src/application/use-cases/copies/set-pass-along-for-all.use-case";
import { updateUserGameUseCase } from "@/src/application/use-cases/copies/update-user-game.use-case";
import { UserGamesRepository } from "@/src/infrastructure/repositories/user-games.repository";
import { MockUserGamesRepository } from "@/src/infrastructure/repositories/user-games.repository.mock";
import { addUserGameController } from "@/src/interface-adapters/controllers/copies/add-user-game.controller";
import { getUserGameController } from "@/src/interface-adapters/controllers/copies/get-user-game.controller";
import { listLibraryController } from "@/src/interface-adapters/controllers/copies/list-library.controller";
import { listMyLibraryController } from "@/src/interface-adapters/controllers/copies/list-my-library.controller";
import { putInBoxController } from "@/src/interface-adapters/controllers/copies/put-in-box.controller";
import { removeUserGameController } from "@/src/interface-adapters/controllers/copies/remove-user-game.controller";
import { setLendingController } from "@/src/interface-adapters/controllers/copies/set-lending.controller";
import { setPassAlongForAllController } from "@/src/interface-adapters/controllers/copies/set-pass-along-for-all.controller";
import { updateUserGameController } from "@/src/interface-adapters/controllers/copies/update-user-game.controller";

export function createCopiesModule() {
  const copiesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    copiesModule
      .bind(DI_SYMBOLS.IUserGamesRepository)
      .toClass(MockUserGamesRepository, [DI_SYMBOLS.IFriendshipsRepository]);
  } else {
    copiesModule
      .bind(DI_SYMBOLS.IUserGamesRepository)
      .toClass(UserGamesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const { ILoggerService: log, ITransactionManagerService: transactions } =
    DI_SYMBOLS;
  copiesModule
    .bind(DI_SYMBOLS.IAddUserGameUseCase)
    .toHigherOrderFunction(addUserGameUseCase, [
      DI_SYMBOLS.IGamesRepository,
      DI_SYMBOLS.IUserGamesRepository,
      DI_SYMBOLS.IUserSettingsRepository,
      transactions,
      log,
    ]);
  copiesModule
    .bind(DI_SYMBOLS.IGetUserGameUseCase)
    .toHigherOrderFunction(getUserGameUseCase, [
      DI_SYMBOLS.IGamesRepository,
      DI_SYMBOLS.IUserGamesRepository,
      DI_SYMBOLS.ILoansRepository,
      DI_SYMBOLS.IUserProfilesRepository,
    ]);
  copiesModule
    .bind(DI_SYMBOLS.IListLibraryUseCase)
    .toHigherOrderFunction(listLibraryUseCase, [
      DI_SYMBOLS.IGamesRepository,
      DI_SYMBOLS.IUserGamesRepository,
      DI_SYMBOLS.ILoansRepository,
      DI_SYMBOLS.IUserProfilesRepository,
      DI_SYMBOLS.IFriendshipsRepository,
    ]);
  copiesModule
    .bind(DI_SYMBOLS.IListMyLibraryUseCase)
    .toHigherOrderFunction(listMyLibraryUseCase, [
      DI_SYMBOLS.IGamesRepository,
      DI_SYMBOLS.IUserGamesRepository,
      DI_SYMBOLS.ILoansRepository,
      DI_SYMBOLS.IUserProfilesRepository,
      DI_SYMBOLS.IUserSettingsRepository,
      DI_SYMBOLS.IFriendshipsRepository,
      DI_SYMBOLS.IGameSuggestionsRepository,
    ]);
  copiesModule
    .bind(DI_SYMBOLS.IPutInBoxUseCase)
    .toHigherOrderFunction(putInBoxUseCase, [
      DI_SYMBOLS.IGamesRepository,
      DI_SYMBOLS.IUserGamesRepository,
      transactions,
      log,
    ]);
  copiesModule
    .bind(DI_SYMBOLS.IRemoveUserGameUseCase)
    .toHigherOrderFunction(removeUserGameUseCase, [
      DI_SYMBOLS.IGamesRepository,
      DI_SYMBOLS.IUserGamesRepository,
      DI_SYMBOLS.ILoansRepository,
      transactions,
      log,
    ]);
  copiesModule
    .bind(DI_SYMBOLS.ISetLendingUseCase)
    .toHigherOrderFunction(setLendingUseCase, [
      DI_SYMBOLS.IUserGamesRepository,
      transactions,
      log,
    ]);
  copiesModule
    .bind(DI_SYMBOLS.ISetPassAlongForAllUseCase)
    .toHigherOrderFunction(setPassAlongForAllUseCase, [
      DI_SYMBOLS.IUserGamesRepository,
      DI_SYMBOLS.IUserSettingsRepository,
      transactions,
      log,
    ]);
  copiesModule
    .bind(DI_SYMBOLS.IUpdateUserGameUseCase)
    .toHigherOrderFunction(updateUserGameUseCase, [
      DI_SYMBOLS.IGamesRepository,
      DI_SYMBOLS.IUserGamesRepository,
      transactions,
      log,
    ]);

  // Each controller takes its use case and the logger.
  const controllers = [
    [
      DI_SYMBOLS.IAddUserGameController,
      addUserGameController,
      DI_SYMBOLS.IAddUserGameUseCase,
    ],
    [
      DI_SYMBOLS.IGetUserGameController,
      getUserGameController,
      DI_SYMBOLS.IGetUserGameUseCase,
    ],
    [
      DI_SYMBOLS.IListLibraryController,
      listLibraryController,
      DI_SYMBOLS.IListLibraryUseCase,
    ],
    [
      DI_SYMBOLS.IListMyLibraryController,
      listMyLibraryController,
      DI_SYMBOLS.IListMyLibraryUseCase,
    ],
    [
      DI_SYMBOLS.IPutInBoxController,
      putInBoxController,
      DI_SYMBOLS.IPutInBoxUseCase,
    ],
    [
      DI_SYMBOLS.IRemoveUserGameController,
      removeUserGameController,
      DI_SYMBOLS.IRemoveUserGameUseCase,
    ],
    [
      DI_SYMBOLS.ISetLendingController,
      setLendingController,
      DI_SYMBOLS.ISetLendingUseCase,
    ],
    [
      DI_SYMBOLS.ISetPassAlongForAllController,
      setPassAlongForAllController,
      DI_SYMBOLS.ISetPassAlongForAllUseCase,
    ],
    [
      DI_SYMBOLS.IUpdateUserGameController,
      updateUserGameController,
      DI_SYMBOLS.IUpdateUserGameUseCase,
    ],
  ] as const;
  for (const [symbol, controller, useCase] of controllers) {
    copiesModule.bind(symbol).toHigherOrderFunction(controller, [useCase, log]);
  }

  return copiesModule;
}
