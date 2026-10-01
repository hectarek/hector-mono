import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import { listChanged } from "@/src/application/use-cases/grocery/list-changed";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";

export type IAddGroceryItemUseCase = ReturnType<typeof addGroceryItemUseCase>;

export const addGroceryItemUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  spacesRepository: ISpacesRepository,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "addGroceryItem",
  });

  return async (
    spaceId: string,
    text: string,
    userId: string,
  ): Promise<void> => {
    await requireSpaceRole(spacesRepository, {
      spaceId,
      userId,
      type: "meal-plan",
      minRole: "editor",
    });
    await groceryItemsRepository.addText(spaceId, text, userId);
    await listChanged(realtimeService, spaceId);
    logger.debug("Item added", { spaceId });
  };
};
