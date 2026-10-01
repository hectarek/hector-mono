import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import {
  personalSpaceName,
  type Space,
  type SpaceType,
} from "@/src/entities/models/space.model";

export type IEnsurePersonalSpaceUseCase = ReturnType<
  typeof ensurePersonalSpaceUseCase
>;

export const ensurePersonalSpaceUseCase = (
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "ensurePersonalSpace",
  });

  return async (userId: string, type: SpaceType): Promise<Space> => {
    const existing = await spacesRepository.findOwned(userId, type);
    if (existing) {
      return existing;
    }

    // Re-check under a per-user lock so two concurrent first loads create one space, not two.
    return transactionManagerService.startTransaction(async (tx) => {
      await spacesRepository.lockOwnerScope(userId, type, tx);

      const created = await spacesRepository.findOwned(userId, type, tx);
      if (created) {
        return created;
      }

      logger.info("Creating personal space", { userId, type });
      const ownerName = await spacesRepository.getUserName(userId, tx);
      return spacesRepository.create(
        { type, name: personalSpaceName(type, ownerName) },
        userId,
        tx,
      );
    });
  };
};
