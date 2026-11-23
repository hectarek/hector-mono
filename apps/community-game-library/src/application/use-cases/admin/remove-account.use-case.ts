import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IRemovedUsersRepository } from "@/src/application/repositories/removed-users.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import {
  type AccountRepositories,
  endAccount,
  removePhotoFile,
} from "@/src/application/use-cases/account/end-account";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import { InputParseError } from "@/src/entities/errors/common";

export type IRemoveAccountUseCase = ReturnType<typeof removeAccountUseCase>;

// The admin removes an account that misuses the app (G8, R41), after its dialog: it ends as a
// deleted account does (endAccount), and a removed_users row keeps it out, so a session it still
// has sees only /removed. Only the admin, and never their own account. Gives back the name, for
// the message.
export const removeAccountUseCase = (
  requireAdmin: IRequireAdmin,
  friendLinksRepository: IFriendLinksRepository,
  friendRequestsRepository: IFriendRequestsRepository,
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  userGamesRepository: IUserGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
  userSettingsRepository: IUserSettingsRepository,
  removedUsersRepository: IRemovedUsersRepository,
  fileStorage: IFileStorage,
  authenticationService: IAuthenticationService,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "removeAccount",
  });
  const repositories: AccountRepositories = {
    friendLinks: friendLinksRepository,
    friendRequests: friendRequestsRepository,
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
    loans: loansRepository,
    notices: noticesRepository,
    userGames: userGamesRepository,
    userProfiles: userProfilesRepository,
    userSettings: userSettingsRepository,
  };

  return async (
    accountId: string,
    adminId: string,
    now: Date,
  ): Promise<{ name: string }> => {
    requireAdmin(adminId);
    if (accountId === adminId) {
      throw new InputParseError("Your own account can’t be removed here.");
    }
    const { name, photoKey } = await transactionManagerService.startTransaction(
      async (tx) => {
        const ended = await endAccount(repositories, accountId, now, tx);
        await removedUsersRepository.add(accountId, now, tx);
        return ended;
      },
    );
    await removePhotoFile(fileStorage, logger, photoKey);
    await authenticationService.deleteUser(accountId);
    logger.info("Account removed", { userId: accountId });
    return { name };
  };
};
