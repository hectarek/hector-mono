import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";

export type IRenameSpaceUseCase = ReturnType<typeof renameSpaceUseCase>;

export const renameSpaceUseCase = (
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "renameSpace" });

  return async (
    spaceId: string,
    name: string,
    userId: string,
  ): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      await requireOwner(spacesRepository, spaceId, userId, tx);
      await spacesRepository.rename(spaceId, name, tx);
    });
    logger.info("Space renamed", { spaceId });
  };
};
