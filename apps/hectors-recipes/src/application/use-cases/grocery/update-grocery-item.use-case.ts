import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import { listChanged } from "@/src/application/use-cases/grocery/list-changed";
import { requireItemEditor } from "@/src/application/use-cases/grocery/require-item-editor";

export type IUpdateGroceryItemUseCase = ReturnType<
  typeof updateGroceryItemUseCase
>;

// Fixing an item's wording. The edited item is treated like one typed in (the repository
// drops its parsed amount), so a later recipe won't sum into a number it no longer shows.
export const updateGroceryItemUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  spacesRepository: ISpacesRepository,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "updateGroceryItem",
  });

  return async (
    itemId: string,
    text: string,
    userId: string,
  ): Promise<void> => {
    const item = await requireItemEditor(
      groceryItemsRepository,
      spacesRepository,
      itemId,
      userId,
    );
    await groceryItemsRepository.updateText(itemId, text);
    await listChanged(realtimeService, item.spaceId);
    logger.debug("Item edited", { itemId });
  };
};
