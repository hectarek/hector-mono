import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import type { SpaceType } from "@/src/entities/models/space.model";

export type IDeleteSpaceUseCase = ReturnType<typeof deleteSpaceUseCase>;

export const deleteSpaceUseCase = (
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "deleteSpace" });

  // Deletes the space and everything in it for every member (cascade).
  return async (spaceId: string, userId: string): Promise<SpaceType> => {
    const space = await transactionManagerService.startTransaction(
      async (tx) => {
        const found = await requireOwner(spacesRepository, spaceId, userId, tx);
        await spacesRepository.delete(spaceId, tx);
        return found;
      },
    );
    logger.info("Space deleted", { spaceId, type: space.type, userId });
    return space.type;
  };
};
