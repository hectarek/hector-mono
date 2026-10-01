import { z } from "zod";
import type { Aisle } from "../aisles";
import type { GroceryListItem } from "../grocery-merge";
import { addDays } from "../week";

// `aisle` comes from the catalog ingredient the item points to (ux-plan D25).
export type GroceryItem = GroceryListItem & {
  spaceId: string;
  createdAt: Date;
  aisle: Aisle | null;
};

// The form sends blank (even all-spaces) text as missing; same message either way.
const itemText = (message: string) =>
  z.string({ error: message }).trim().min(1, message).max(200);

export const addGroceryItemSchema = z.object({
  spaceId: z.uuid(),
  text: itemText("Type something to add"),
});

export const updateGroceryItemSchema = z.object({
  itemId: z.uuid(),
  text: itemText("Type something, or remove the item instead"),
});

export const addRecipesToListSchema = z.object({
  // Add even a recipe that's still on the list (the user said "add again").
  again: z.boolean().default(false),
  // Whose list (a plan's list is part of the plan). Omitted: the user's default plan, created
  // if they have none.
  planId: z.uuid().optional(),
  recipes: z
    .array(
      z.object({
        recipeId: z.uuid(),
        servings: z.number().int().min(1).max(100).optional(),
      }),
    )
    .min(1)
    .max(50),
});
export type AddRecipesToListInput = z.infer<typeof addRecipesToListSchema>;

// Which planned meals the grocery button adds, by cook day from today (docs/ux-plan.md D44).
export const GROCERY_RANGES = [
  "next-3-days",
  "next-7-days",
  "next-14-days",
  "all-upcoming",
] as const;
export type GroceryRange = (typeof GROCERY_RANGES)[number];
export const DEFAULT_GROCERY_RANGE: GroceryRange = "next-7-days";

// The cook days a range covers: from today, through its last day (none for all upcoming).
export function groceryRangeDays(
  range: GroceryRange,
  today: string,
): { from: string; to: string | null } {
  const days = { "next-3-days": 3, "next-7-days": 7, "next-14-days": 14 };
  return {
    from: today,
    to: range === "all-upcoming" ? null : addDays(today, days[range] - 1),
  };
}

// A plan's meals onto its list (D41, D44): the meals cooking in a range not on it yet, or
// one meal from its sheet, saying which button was pressed: "Add to grocery list", or "Add to
// list again" (`again`).
export const addPlanToListSchema = z.object({
  planId: z.uuid(),
  entryId: z.uuid().optional(),
  range: z.enum(GROCERY_RANGES).default(DEFAULT_GROCERY_RANGE),
  again: z.boolean().default(false),
});

export type AddToListResult = {
  planId: string;
  added: number;
  merged: number;
  skipped: number;
  // Recipes (or planned meals) left out because they're already on a list.
  alreadyAdded: number;
};
