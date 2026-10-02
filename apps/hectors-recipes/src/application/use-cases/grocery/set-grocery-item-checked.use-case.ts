import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { listChanged } from "@/src/application/use-cases/grocery/list-changed";
import { requireItemEditor } from "@/src/application/use-cases/grocery/require-item-editor";

export type ISetGroceryItemCheckedUseCase = ReturnType<
  typeof setGroceryItemCheckedUseCase
>;

export const setGroceryItemCheckedUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "setGroceryItemChecked",
  });

  return async (
    itemId: string,
    checked: boolean,
    userId: string,
  ): Promise<void> => {
    const item = await transactionManagerService.startTransaction(
      async (tx) => {
        const found = await requireItemEditor(
          groceryItemsRepository,
          spacesRepository,
          itemId,
          userId,
          tx,
        );
        await groceryItemsRepository.setChecked(itemId, checked, tx);
        return found;
      },
    );
    await listChanged(realtimeService, item.spaceId);
    logger.debug("Item checked", { itemId, checked });
  };
};
