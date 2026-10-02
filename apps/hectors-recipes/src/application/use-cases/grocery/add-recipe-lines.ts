import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import {
  formatGroceryText,
  type GroceryLine,
  groceryText,
  noteSources,
  planGroceryBatch,
  singularName,
} from "@/src/entities/grocery-merge";
import {
  parseIngredientLine,
  stripMarkdown,
  UNITS,
} from "@/src/entities/ingredient-line";
import type { AddToListResult } from "@/src/entities/models/grocery-item.model";
import type { RecipeWithIngredients } from "@/src/entities/models/recipe.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { scaleLine } from "@/src/entities/scaling";

// Recipe lines at the chosen servings, ready for the batch planner: the amount and name,
// never the note, and no optional lines (ux-plan D23, D25). A line with no name yet (never
// itemized) goes on as its original words, minus the note.
function toGroceryLines(
  recipe: RecipeWithIngredients,
  servings: number | undefined,
): GroceryLine[] {
  const factor =
    servings && recipe.yieldServings ? servings / recipe.yieldServings : 1;

  return recipe.ingredients.flatMap((line) => {
    if (line.optional) return [];
    const quantity = line.quantity === null ? null : line.quantity * factor;
    const unit = UNITS.find((candidate) => candidate === line.unit) ?? null;
    const common = {
      quantity,
      unit,
      ingredientId: line.ingredientId,
      source: recipe.title,
    };
    if (!line.name) {
      return [
        {
          ...common,
          text: groceryText(stripMarkdown(scaleLine(line.raw, factor))),
          name: parseIngredientLine(line.raw).name,
        },
      ];
    }
    const name = singularName(line.name);
    return [
      {
        ...common,
        text:
          quantity === null
            ? line.name
            : formatGroceryText({ quantity, unit, name }),
        name,
      },
    ];
  });
}

// The recipes whose items are still unchecked on the list, by title (the "for …" notes).
// Adding one of them again would sum into those items and double every amount, so both
// ways of adding leave them out unless the user asks again.
export async function recipesOnList(
  groceryItemsRepository: IGroceryItemsRepository,
  planId: string,
  tx: ITransaction,
): Promise<Set<string>> {
  const items = await groceryItemsRepository.list(planId, tx);
  return new Set(
    items
      .filter((item) => !item.checked)
      .flatMap((item) => noteSources(item.sourceNote)),
  );
}

// Shared by "add a recipe" and the plan's grocery button: plan against what's unchecked now,
// write once.
export async function addRecipeLines(
  groceryItemsRepository: IGroceryItemsRepository,
  planId: string,
  recipes: { recipe: RecipeWithIngredients; servings?: number }[],
  userId: string,
  tx: ITransaction,
): Promise<Omit<AddToListResult, "alreadyAdded">> {
  const lines = recipes.flatMap(({ recipe, servings }) =>
    toGroceryLines(recipe, servings),
  );
  const current = await groceryItemsRepository.list(planId, tx);
  const changes = planGroceryBatch(
    lines,
    current.filter((item) => !item.checked),
  );
  await groceryItemsRepository.applyChanges(planId, changes, userId, tx);

  return {
    planId,
    added: changes.inserts.length,
    merged: lines.length - changes.inserts.length - changes.skipped,
    skipped: changes.skipped,
  };
}
