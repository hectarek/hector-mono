import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import { listChanged } from "@/src/application/use-cases/grocery/list-changed";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";

export type IClearCheckedItemsUseCase = ReturnType<
  typeof clearCheckedItemsUseCase
>;

export const clearCheckedItemsUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  spacesRepository: ISpacesRepository,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "clearCheckedItems",
  });

  return async (spaceId: string, userId: string): Promise<number> => {
    await requireSpaceRole(spacesRepository, {
      spaceId,
      userId,
      type: "meal-plan",
      minRole: "editor",
    });
    const removed = await groceryItemsRepository.deleteChecked(spaceId);
    if (removed) {
      await listChanged(realtimeService, spaceId);
    }
    logger.info("Checked items cleared", { spaceId, removed });
    return removed;
  };
};
