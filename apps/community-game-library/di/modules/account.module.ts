import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { deleteAccountUseCase } from "@/src/application/use-cases/account/delete-account.use-case";
import { listWhatEndsUseCase } from "@/src/application/use-cases/account/list-what-ends.use-case";
import { listAccountsUseCase } from "@/src/application/use-cases/admin/list-accounts.use-case";
import { removeAccountUseCase } from "@/src/application/use-cases/admin/remove-account.use-case";
import { deleteAccountController } from "@/src/interface-adapters/controllers/account/delete-account.controller";
import { listAccountsController } from "@/src/interface-adapters/controllers/account/list-accounts.controller";
import { listWhatEndsController } from "@/src/interface-adapters/controllers/account/list-what-ends.controller";
import { removeAccountController } from "@/src/interface-adapters/controllers/account/remove-account.controller";

// Deleting an account and the admin's removal (U22). The repositories come from their own
// modules; an account's end writes to most of them.
export function createAccountModule() {
  const accountModule = createModule();
  const {
    IFileStorage: storage,
    IFriendLinksRepository: friendLinks,
    IFriendRequestsRepository: friendRequests,
    IFriendshipsRepository: friendships,
    IGameNightsRepository: gameNights,
    IGamesRepository: games,
    ILoansRepository: loans,
    ILoggerService: log,
    INoticesRepository: notices,
    IRemovedUsersRepository: removedUsers,
    IRequireAdmin: requireAdmin,
    ISignInsRepository: signIns,
    ITransactionManagerService: transactions,
    IUserGamesRepository: userGames,
    IUserProfilesRepository: profiles,
    IUserSettingsRepository: settings,
  } = DI_SYMBOLS;
  const accountRepositories = [
    friendLinks,
    friendRequests,
    friendships,
    gameNights,
    loans,
    notices,
    userGames,
    profiles,
    settings,
    signIns,
  ] as const;

  accountModule
    .bind(DI_SYMBOLS.IListWhatEndsUseCase)
    .toHigherOrderFunction(listWhatEndsUseCase, [
      userGames,
      loans,
      games,
      profiles,
      gameNights,
    ]);
  accountModule
    .bind(DI_SYMBOLS.IListWhatEndsController)
    .toHigherOrderFunction(listWhatEndsController, [
      DI_SYMBOLS.IListWhatEndsUseCase,
      log,
    ]);
  accountModule
    .bind(DI_SYMBOLS.IDeleteAccountUseCase)
    .toHigherOrderFunction(deleteAccountUseCase, [
      ...accountRepositories,
      storage,
      transactions,
      log,
    ]);
  accountModule
    .bind(DI_SYMBOLS.IDeleteAccountController)
    .toHigherOrderFunction(deleteAccountController, [
      DI_SYMBOLS.IDeleteAccountUseCase,
      log,
    ]);
  accountModule
    .bind(DI_SYMBOLS.IListAccountsUseCase)
    .toHigherOrderFunction(listAccountsUseCase, [
      requireAdmin,
      profiles,
      userGames,
      loans,
    ]);
  accountModule
    .bind(DI_SYMBOLS.IListAccountsController)
    .toHigherOrderFunction(listAccountsController, [
      DI_SYMBOLS.IListAccountsUseCase,
      log,
    ]);
  accountModule
    .bind(DI_SYMBOLS.IRemoveAccountUseCase)
    .toHigherOrderFunction(removeAccountUseCase, [
      requireAdmin,
      ...accountRepositories,
      removedUsers,
      storage,
      transactions,
      log,
    ]);
  accountModule
    .bind(DI_SYMBOLS.IRemoveAccountController)
    .toHigherOrderFunction(removeAccountController, [
      DI_SYMBOLS.IRemoveAccountUseCase,
      log,
    ]);

  return accountModule;
}
