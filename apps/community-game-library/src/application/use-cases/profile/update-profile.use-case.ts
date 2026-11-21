import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { ProfileForm } from "@/src/entities/models/user-profile.model";

export type IUpdateProfileUseCase = ReturnType<typeof updateProfileUseCase>;

// E6's Save: the name, phone and piece. The photo has its own steps.
export const updateProfileUseCase = (
  userProfilesRepository: IUserProfilesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "updateProfile",
  });

  return async (form: ProfileForm, userId: string): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      if (!(await userProfilesRepository.getByUserId(userId, tx))) {
        throw new NotFoundError();
      }
      await userProfilesRepository.update(userId, form, tx);
    });
    logger.debug("Profile updated", { userId });
  };
};
