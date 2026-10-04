import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { listChanged } from "@/src/application/use-cases/grocery/list-changed";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";

export type IClearGroceryListUseCase = ReturnType<
  typeof clearGroceryListUseCase
>;

// Starts a plan's list over (docs/ux-plan.md D52): every item goes, checked or not, and none of
// the plan's meals counts as on the list any more, so Plan's grocery button can add them again.
export const clearGroceryListUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  planEntriesRepository: IPlanEntriesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "clearGroceryList",
  });

  return async (planId: string, userId: string): Promise<number> => {
    const removed = await transactionManagerService.startTransaction(
      async (tx) => {
        await requireSpaceRole(
          spacesRepository,
          { spaceId: planId, userId, type: "meal-plan", minRole: "editor" },
          tx,
        );
        const count = await groceryItemsRepository.deleteAll(planId, tx);
        await planEntriesRepository.unmarkAddedToList(planId, tx);
        return count;
      },
    );
    if (removed) {
      await listChanged(realtimeService, planId);
    }
    logger.info("Grocery list cleared", { planId, removed });
    return removed;
  };
};
