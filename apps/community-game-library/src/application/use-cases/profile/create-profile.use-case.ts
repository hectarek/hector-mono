import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type {
  ProfileForm,
  UserProfile,
} from "@/src/entities/models/user-profile.model";

export type ICreateProfileUseCase = ReturnType<typeof createProfileUseCase>;

// A new member's profile and settings, made together (A4, R40, R51). A second send, after a photo
// that failed or a second tab, finds the profile there and updates it with what was sent.
export const createProfileUseCase = (
  userProfilesRepository: IUserProfilesRepository,
  userSettingsRepository: IUserSettingsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "createProfile",
  });

  return async (form: ProfileForm, userId: string): Promise<UserProfile> =>
    transactionManagerService.startTransaction(async (tx) => {
      const existing = await userProfilesRepository.getByUserId(userId, tx);
      if (existing) {
        await userProfilesRepository.update(userId, form, tx);
        logger.debug("Profile already there, updated", { userId });
        return { ...existing, ...form };
      }
      const profile = await userProfilesRepository.create(
        {
          userId,
          name: form.name,
          pieceShape: form.pieceShape,
          pieceColor: form.pieceColor,
          phone: form.phone,
        },
        tx,
      );
      await userSettingsRepository.create({ userId }, tx);
      logger.debug("Profile created", { userId });
      return profile;
    });
};
