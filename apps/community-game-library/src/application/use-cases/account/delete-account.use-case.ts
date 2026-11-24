import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ISignInsRepository } from "@/src/application/repositories/sign-ins.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import {
  type AccountRepositories,
  endAccount,
  removePhotoFile,
} from "@/src/application/use-cases/account/end-account";

export type IDeleteAccountUseCase = ReturnType<typeof deleteAccountUseCase>;

// Delete my account (E9, R41), after its dialog: everything endAccount lists goes in one
// transaction, their sign-in anonymized with it, refused while a loan of theirs is unsettled. Then
// their photo leaves storage, and the action signs this device out.
export const deleteAccountUseCase = (
  friendLinksRepository: IFriendLinksRepository,
  friendRequestsRepository: IFriendRequestsRepository,
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  userGamesRepository: IUserGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
  userSettingsRepository: IUserSettingsRepository,
  signInsRepository: ISignInsRepository,
  fileStorage: IFileStorage,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "deleteAccount",
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
    signIns: signInsRepository,
  };

  return async (userId: string, now: Date): Promise<void> => {
    const { photoKey } = await transactionManagerService.startTransaction(
      (tx) => endAccount(repositories, userId, now, tx),
    );
    await removePhotoFile(fileStorage, logger, photoKey);
    logger.info("Account deleted", { userId });
  };
};
