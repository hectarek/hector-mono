import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";

export type IClearMealPlanUseCase = ReturnType<typeof clearMealPlanUseCase>;

// Starts a plan over (docs/ux-plan.md D91): every meal goes, in every week. Groceries stay as
// they are; a recipe planned again while its items are still there counts them as its meal's (D45).
export const clearMealPlanUseCase = (
  planEntriesRepository: IPlanEntriesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "clearMealPlan",
  });

  return async (planId: string, userId: string): Promise<number> => {
    const removed = await transactionManagerService.startTransaction(
      async (tx) => {
        await requireSpaceRole(
          spacesRepository,
          { spaceId: planId, userId, type: "meal-plan", minRole: "editor" },
          tx,
        );
        return planEntriesRepository.deleteAll(planId, tx);
      },
    );
    logger.info("Meal plan cleared", { planId, removed });
    return removed;
  };
};
