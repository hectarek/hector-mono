import { z } from "zod";
import { isIsoDate } from "../week";

export const isoDateSchema = z
  .string()
  .refine(isIsoDate, { error: "Pick a valid date" });

// A planned meal is one cooking of a recipe (docs/ux-plan.md D38): the day it's cooked, and
// the days it's eaten, which servings don't decide. Only the cook day is checked off (D39).
const planEntrySchema = z.object({
  id: z.uuid(),
  spaceId: z.uuid(),
  cookDate: isoDateSchema,
  // Sorted, each once, none before the cook day.
  eatDates: z.array(isoDateSchema),
  // Saved when the entry is added, so it survives the recipe being deleted.
  title: z.string().min(1),
  recipeId: z.uuid().nullable(),
  cooked: z.boolean(),
  // When its ingredients were last added to the list; null if never.
  addedToListAt: z.date().nullable(),
  createdBy: z.uuid(),
  createdAt: z.date(),
});
export type PlanEntry = z.infer<typeof planEntrySchema>;

const mealDays = {
  cookDate: isoDateSchema,
  eatDates: z
    .array(isoDateSchema)
    .min(1, { error: "Pick at least one day to eat it" })
    .max(14, { error: "Pick at most 14 days" }),
};

type MealDays = { cookDate: string; eatDates: string[] };

function notBeforeCooking({ cookDate, eatDates }: MealDays): boolean {
  return eatDates.every((date) => date >= cookDate);
}
const EATEN_BEFORE_COOKED = {
  error: "A meal can't be eaten before it's cooked",
  path: ["eatDates"],
};

function sortedDays<T extends MealDays>(days: T): T {
  return { ...days, eatDates: [...new Set(days.eatDates)].sort() };
}

// Everything on a plan comes from a recipe (D40); its title is copied from it.
export const addPlanEntrySchema = z
  .object({ spaceId: z.uuid(), recipeId: z.uuid(), ...mealDays })
  .refine(notBeforeCooking, EATEN_BEFORE_COOKED)
  .transform(sortedDays);
export type AddPlanEntryInput = z.infer<typeof addPlanEntrySchema>;

export const changeMealDaysSchema = z
  .object({ entryId: z.uuid(), ...mealDays })
  .refine(notBeforeCooking, EATEN_BEFORE_COOKED)
  .transform(sortedDays);

export type NewPlanEntry = {
  spaceId: string;
  cookDate: string;
  eatDates: string[];
  title: string;
  recipeId: string;
};
