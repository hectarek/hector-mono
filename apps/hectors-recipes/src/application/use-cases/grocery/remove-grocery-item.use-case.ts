import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import { listChanged } from "@/src/application/use-cases/grocery/list-changed";
import { requireItemEditor } from "@/src/application/use-cases/grocery/require-item-editor";

export type IRemoveGroceryItemUseCase = ReturnType<
  typeof removeGroceryItemUseCase
>;

export const removeGroceryItemUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  spacesRepository: ISpacesRepository,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "removeGroceryItem",
  });

  return async (itemId: string, userId: string): Promise<void> => {
    const item = await requireItemEditor(
      groceryItemsRepository,
      spacesRepository,
      itemId,
      userId,
    );
    await groceryItemsRepository.delete(itemId);
    await listChanged(realtimeService, item.spaceId);
    logger.debug("Item removed", { itemId });
  };
};
