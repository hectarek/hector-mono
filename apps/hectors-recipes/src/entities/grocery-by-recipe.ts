import {
  formatGroceryText,
  type GroceryListItem,
  singularName,
} from "./grocery-merge";
import { readLeadingQuantity, readUnit } from "./ingredient-line";

type Groupable = Pick<GroceryListItem, "text" | "quantity" | "recipes">;

// One heading of the list by recipe (ux-plan D60): `recipeId` is null for items added by hand.
export type RecipeGroup<T> = {
  recipeId: string | null;
  label: string;
  rows: { item: T; text: string }[];
};

// An item's text at one recipe's share of it: the merged "6 cloves garlic" reads "2 cloves
// garlic" for the recipe that put in 2. Its own text when the share is all of it, or when
// either has no amount (an amount-less line, or an item edited into plain text). Only the
// amount and unit are read back; the name stays as the list wrote it.
export function shareText(item: Groupable, share: number | null): string {
  if (share === null || item.quantity === null || share === item.quantity) {
    return item.text;
  }
  const amount = readLeadingQuantity(item.text);
  if (!amount) {
    return item.text;
  }
  const { unit, rest } = readUnit(item.text.slice(amount.length).trimStart());
  return rest
    ? formatGroceryText({ quantity: share, unit, name: singularName(rest) })
    : item.text;
}

// What's left to buy under each recipe it's for, at that recipe's share, recipes in the order
// their first item was added. Items added by hand come last.
export function groupByRecipe<T extends Groupable>(
  items: T[],
): RecipeGroup<T>[] {
  const groups = new Map<string, RecipeGroup<T>>();
  const byHand: RecipeGroup<T> = {
    recipeId: null,
    label: "Added by hand",
    rows: [],
  };
  for (const item of items) {
    if (item.recipes.length === 0) {
      byHand.rows.push({ item, text: item.text });
    }
    for (const recipe of item.recipes) {
      const group = groups.get(recipe.recipeId) ?? {
        recipeId: recipe.recipeId,
        label: recipe.title,
        rows: [],
      };
      group.rows.push({ item, text: shareText(item, recipe.quantity) });
      groups.set(recipe.recipeId, group);
    }
  }
  return byHand.rows.length
    ? [...groups.values(), byHand]
    : [...groups.values()];
}
