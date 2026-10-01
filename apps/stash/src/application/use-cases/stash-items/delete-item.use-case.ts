import type { IStashItemsRepository } from "@/src/application/repositories/stash-items.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";

export type IDeleteItemUseCase = ReturnType<typeof deleteItemUseCase>;

export const deleteItemUseCase = (
  stashItemsRepository: IStashItemsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "deleteItem",
  });

  return async (itemId: string, userId: string): Promise<void> => {
    logger.info("Deleting stash item", { itemId, userId });

    const item = await stashItemsRepository.getById(itemId);

    if (!item) {
      logger.warn("Item not found", { itemId });
      throw new NotFoundError("Stash item not found");
    }

    if (item.userId !== userId) {
      logger.warn("Unauthorized access attempt", { itemId, userId });
      throw new UnauthorizedError("Cannot delete this item");
    }

    await stashItemsRepository.delete(itemId);
    logger.debug("Item deleted", { itemId });
  };
};
