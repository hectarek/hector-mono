import type { IActivityEventsRepository } from "@/src/application/repositories/activity-events.repository.interface";
import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordActivity } from "@/src/application/use-cases/activity/record-activity";
import { NotFoundError } from "@/src/entities/errors/common";
import { newActivity } from "@/src/entities/models/activity-event.model";

export type IRecordViewUseCase = ReturnType<typeof recordViewUseCase>;

// Records that this person opened a recipe's page, a `recipe-viewed` event, for the library's
// Recently viewed (docs/ux-plan.md D106). Anyone who can open a recipe can view it: opening one
// needs only a session (getRecipe), so the recipe has only to exist, as with bookmarks.
export const recordViewUseCase = (
  activityEventsRepository: IActivityEventsRepository,
  recipesRepository: IRecipesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "recordView",
  });

  return async (userId: string, recipeId: string): Promise<void> => {
    const recorded = await transactionManagerService.startTransaction(
      async (tx) => {
        if (!(await recipesRepository.getById(recipeId, tx))) {
          throw new NotFoundError("Recipe not found");
        }
        return recordActivity(
          activityEventsRepository,
          newActivity("recipe-viewed", userId, { recipeId }, {}),
          tx,
        );
      },
    );
    logger.debug("View recorded", { recipeId, recorded });
  };
};
