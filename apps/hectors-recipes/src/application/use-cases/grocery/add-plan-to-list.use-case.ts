import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
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
import {
  type AddToListResult,
  DEFAULT_GROCERY_RANGE,
  type GroceryRange,
  groceryRangeDays,
} from "@/src/entities/models/grocery-item.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export type IAddPlanToListUseCase = ReturnType<typeof addPlanToListUseCase>;

// A plan's meals onto its own list, each at its recipe's servings (docs/ux-plan.md D41).
// Without a meal: the meals cooking in the range from today (D44) not on the list yet,
// leaving out cooked ones (they were shopped for). With a meal: that one, whatever its day:
// "Add to grocery list" the first time, which does nothing if it's on the list by then (a
// sheet that's out of date, or two presses at once), and "Add to list again" (`again`) after.
//
// A recipe still unchecked on the list from its own Add to list covers one planned meal of
// it, the earliest, which is marked as on the list rather than added again. While a planned
// meal of it that's added and still to cook exists, the items are that meal's, and the next
// is a second batch (D45). Every meal handled is marked, and adds to a list take turns (the
// meal is read after the lock), so pressing twice, or two people pressing at once, never
// doubles an amount.
export const addPlanToListUseCase = (
  groceryItemsRepository: IGroceryItemsRepository,
  planEntriesRepository: IPlanEntriesRepository,
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  realtimeService: IRealtimeService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "addPlanToList",
  });

  // The recipes whose unchecked items on the list came from adding the recipe on its own
  // (D45): on the list by title, with no planned meal of them added and still to cook.
  async function coveredByList(
    planId: string,
    recipes: { id: string; title: string }[],
    today: string,
    tx: ITransaction,
  ): Promise<Set<string>> {
    const onList = await recipesOnList(groceryItemsRepository, planId, tx);
    const fromPlan = new Set(
      await planEntriesRepository.addedRecipeIds(planId, today, tx),
    );
    return new Set(
      recipes
        .filter(
          (recipe) => onList.has(recipe.title) && !fromPlan.has(recipe.id),
        )
        .map((recipe) => recipe.id),
    );
  }

  return async (
    planId: string,
    userId: string,
    {
      entryId,
      range = DEFAULT_GROCERY_RANGE,
      again = false,
      today,
    }: {
      entryId?: string;
      range?: GroceryRange;
      again?: boolean;
      today: string;
    },
  ): Promise<AddToListResult> => {
    const access = {
      spaceId: planId,
      userId,
      type: "meal-plan",
      minRole: "editor",
    } as const;
    await requireSpaceRole(spacesRepository, access);

    const result = await transactionManagerService.startTransaction(
      async (tx) => {
        await requireSpaceRole(spacesRepository, access, tx);
        await groceryItemsRepository.lockList(planId, tx);
        // Read after the lock, inside the transaction: a press that just finished has marked it.
        const one = entryId
          ? await planEntriesRepository.getById(entryId, tx)
          : undefined;
        if (entryId && (!one || one.spaceId !== planId)) {
          throw new NotFoundError("That meal is no longer on the plan");
        }
        if (one?.addedToListAt && !again) {
          return { planId, added: 0, merged: 0, skipped: 0, alreadyAdded: 1 };
        }
        const entries = one
          ? [one]
          : await planEntriesRepository.listNotAdded(
              planId,
              groceryRangeDays(range, today),
              tx,
            );

        const found = new Map(
          (
            await recipesRepository.getByIds(
              entries.flatMap((entry) => entry.recipeId ?? []),
              tx,
            )
          ).map((recipe) => [recipe.id, recipe]),
        );
        // A deleted recipe can't be added.
        const meals = entries.flatMap((entry) => {
          const recipe = entry.recipeId && found.get(entry.recipeId);
          return recipe ? [{ entry, recipe }] : [];
        });
        if (entryId && !meals.length) {
          throw new NotFoundError("That meal's recipe no longer exists");
        }

        const covered = again
          ? new Set<string>()
          : await coveredByList(
              planId,
              meals.map(({ recipe }) => recipe),
              today,
              tx,
            );
        // Each recipe's items cover one meal, the first in cook-day order.
        const toAdd = meals.filter(({ recipe }) => !covered.delete(recipe.id));
        const alreadyAdded = meals.length - toAdd.length;
        const added = toAdd.length
          ? await addRecipeLines(
              groceryItemsRepository,
              planId,
              toAdd.map(({ recipe }) => ({ recipe })),
              userId,
              tx,
            )
          : { planId, added: 0, merged: 0, skipped: 0 };
        await planEntriesRepository.markAddedToList(
          meals.map(({ entry }) => entry.id),
          new Date(),
          tx,
        );
        return { ...added, alreadyAdded };
      },
    );

    if (result.added + result.merged) {
      await listChanged(realtimeService, planId);
    }
    logger.info("Plan added to list", { entryId, ...result });
    return result;
  };
};
