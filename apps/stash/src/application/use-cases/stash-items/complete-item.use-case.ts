import type { IStashItemsRepository } from "@/src/application/repositories/stash-items.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import type { StashItem } from "@/src/entities/models/stash-item.model";

export type ICompleteItemUseCase = ReturnType<typeof completeItemUseCase>;

export const completeItemUseCase = (
  stashItemsRepository: IStashItemsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "completeItem",
  });

  return async (itemId: string, userId: string): Promise<StashItem> => {
    logger.info("Completing stash item", { itemId, userId });

    const item = await stashItemsRepository.getById(itemId);

    if (!item) {
      logger.warn("Item not found", { itemId });
      throw new NotFoundError("Stash item not found");
    }

    if (item.userId !== userId) {
      logger.warn("Unauthorized access attempt", { itemId, userId });
      throw new UnauthorizedError("Cannot modify this item");
    }

    return stashItemsRepository.update(itemId, {
      status: "completed",
      completedAt: new Date(),
    });
  };
};
