import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRealtimeService } from "@/src/application/services/realtime.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import {
  addRecipeLines,
  recipesOnList,
} from "@/src/application/use-cases/grocery/add-recipe-lines";
import { listChanged } from "@/src/application/use-cases/grocery/list-changed";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";
import type { AddToListResult } from "@/src/entities/models/grocery-item.model";

export type IAddRecipesToListUseCase = ReturnType<
  typeof addRecipesToListUseCase
>;

export const addRecipesToListUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "addRecipesToList",
  });

  return async (
    planId: string,
    recipes: { recipeId: string; servings?: number }[],
    userId: string,
    { again = false }: { again?: boolean } = {},
  ): Promise<AddToListResult> => {
    const result = await transactionManagerService.startTransaction(
      async (tx) => {
        await requireSpaceRole(
          spacesRepository,
          { spaceId: planId, userId, type: "meal-plan", minRole: "editor" },
          tx,
        );
        await groceryItemsRepository.lockList(planId, tx);

        const found = new Map(
          (
            await recipesRepository.getByIds(
              recipes.map(({ recipeId }) => recipeId),
              tx,
            )
          ).map((recipe) => [recipe.id, recipe]),
        );
        const loaded = recipes.map(({ recipeId, servings }) => {
          const recipe = found.get(recipeId);
          if (!recipe) {
            throw new NotFoundError("That recipe no longer exists");
          }
          return { recipe, servings };
        });

        const onList = again
          ? new Set<string>()
          : await recipesOnList(groceryItemsRepository, planId, tx);
        const toAdd = loaded.filter(({ recipe }) => !onList.has(recipe.id));
        const alreadyAdded = loaded.length - toAdd.length;
        if (!toAdd.length) {
          return { planId, added: 0, merged: 0, skipped: 0, alreadyAdded };
        }
        return {
          ...(await addRecipeLines(
            groceryItemsRepository,
            planId,
            toAdd,
            userId,
            tx,
          )),
          alreadyAdded,
        };
      },
    );

    if (result.added + result.merged) {
      await listChanged(realtimeService, planId);
    }
    logger.info("Recipes added to list", { ...result });
    return result;
  };
};
