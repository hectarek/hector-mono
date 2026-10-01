import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import type { GroceryItem } from "@/src/entities/models/grocery-item.model";

export type IGetGroceryListUseCase = ReturnType<typeof getGroceryListUseCase>;

export const getGroceryListUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getGroceryList",
  });

  return async (spaceId: string, userId: string): Promise<GroceryItem[]> => {
    await requireSpaceRole(spacesRepository, {
      spaceId,
      userId,
      type: "meal-plan",
      minRole: "viewer",
    });
    const items = await groceryItemsRepository.list(spaceId);
    logger.debug("List loaded", { spaceId, count: items.length });
    return items;
  };
};
