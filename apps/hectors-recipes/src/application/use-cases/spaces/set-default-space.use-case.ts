import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import type { SpaceType } from "@/src/entities/models/space.model";

export type ISetDefaultSpaceUseCase = ReturnType<typeof setDefaultSpaceUseCase>;

// The book or plan the app opens to for this person. Any member may choose one, view-only
// included; null clears the choice (for books, that's All recipes).
export const setDefaultSpaceUseCase = (
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "setDefaultSpace",
  });

  return async (
    userId: string,
    type: SpaceType,
    spaceId: string | null,
  ): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      if (spaceId) {
        await requireSpaceRole(
          spacesRepository,
          { spaceId, userId, type, minRole: "viewer" },
          tx,
        );
      }
      await spacesRepository.setDefault(userId, type, spaceId, tx);
    });
    logger.info("Default space set", { userId, type, spaceId });
  };
};
