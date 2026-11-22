import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import { PHOTO_EXTENSIONS, type Photo } from "@/src/entities/profile-photo";

export type ISetPhotoUseCase = ReturnType<typeof setPhotoUseCase>;

// A new photo (E6): the shrunk picture goes into the private bucket under a key of its own, the
// row keeps the key, and the old picture is removed (KTD11, rule 14). The key is new each time,
// so a signed address for the old one can't show the old picture afterwards.
export const setPhotoUseCase = (
  userProfilesRepository: IUserProfilesRepository,
  fileStorage: IFileStorage,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "setPhoto" });

  return async (photo: Photo, userId: string): Promise<void> => {
    const profile = await userProfilesRepository.getByUserId(userId);
    if (!profile) {
      throw new NotFoundError();
    }
    const key = `${userId}/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[photo.contentType]}`;
    await fileStorage.put(
      "profile-photos",
      key,
      photo.bytes,
      photo.contentType,
    );
    try {
      await transactionManagerService.startTransaction(async (tx) => {
        await userProfilesRepository.update(userId, { photoKey: key }, tx);
      });
    } catch (err) {
      // The row never took the key: the new file would be left with nothing pointing at it.
      await fileStorage.remove("profile-photos", key).catch((removeErr) => {
        logger.warn("Couldn't remove an unused photo", loggable(removeErr));
      });
      throw err;
    }
    if (profile.photoKey) {
      await fileStorage
        .remove("profile-photos", profile.photoKey)
        .catch((err) => {
          logger.warn("Couldn't remove the old photo", loggable(err));
        });
    }
    logger.debug("Photo set", { userId });
  };
};
