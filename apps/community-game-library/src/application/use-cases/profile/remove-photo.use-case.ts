import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";

export type IRemovePhotoUseCase = ReturnType<typeof removePhotoUseCase>;

// Takes the member's photo away (E6): the row forgets its key, then the file goes.
export const removePhotoUseCase = (
  userProfilesRepository: IUserProfilesRepository,
  fileStorage: IFileStorage,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "removePhoto",
  });

  return async (userId: string): Promise<void> => {
    const profile = await userProfilesRepository.getByUserId(userId);
    if (!profile) {
      throw new NotFoundError();
    }
    if (!profile.photoKey) {
      return;
    }
    await transactionManagerService.startTransaction(async (tx) => {
      await userProfilesRepository.update(userId, { photoKey: null }, tx);
    });
    await fileStorage
      .remove("profile-photos", profile.photoKey)
      .catch((err) => {
        logger.warn("Couldn't remove the photo", loggable(err));
      });
    logger.debug("Photo removed", { userId });
  };
};
