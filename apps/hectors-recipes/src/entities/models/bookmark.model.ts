import { z } from "zod";

// Saving a recipe, or no longer (docs/ux-plan.md D77).
export const setBookmarkSchema = z.object({
  recipeId: z.uuid(),
  saved: z.boolean(),
});
