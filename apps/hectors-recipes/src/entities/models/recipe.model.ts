import { z } from "zod";
import {
  type RecipeLineWrite,
  recipeIngredientInputSchema,
  recipeIngredientSchema,
} from "./recipe-ingredient.model";
import {
  type RecipeStepWrite,
  recipeStepInputSchema,
  recipeStepSchema,
} from "./recipe-step.model";

const tagsSchema = z
  .array(z.string().trim().toLowerCase().min(1))
  .transform((tags) => [...new Set(tags)]);

const recipeSchema = z.object({
  id: z.uuid(),
  spaceId: z.uuid(),
  createdBy: z.uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  timeMinutes: z.number().int().nonnegative().nullable(),
  yieldServings: z.number().int().positive().nullable(),
  tags: z.array(z.string()),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  copiedFromRecipeId: z.uuid().nullable(),
  externalRef: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Recipe = z.infer<typeof recipeSchema>;

// A recipe with its itemized ingredient lines and steps.
const recipeWithIngredientsSchema = recipeSchema.extend({
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(recipeStepSchema),
});
export type RecipeWithIngredients = z.infer<typeof recipeWithIngredientsSchema>;

// Optional fields accept null (explicitly empty) so create and edit share one form shape.
export const createRecipeSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  timeMinutes: z.number().int().nonnegative().nullable().optional(),
  yieldServings: z.number().int().positive().nullable().optional(),
  tags: tagsSchema.optional(),
  sourceUrl: z.url().nullable().optional(),
  imageUrl: z.url().nullable().optional(),
  ingredients: z.array(recipeIngredientInputSchema).min(1),
  steps: z.array(recipeStepInputSchema).optional(),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;

export const updateRecipeSchema = createRecipeSchema.partial();
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

// What the repository stores: the validated input with each ingredient line itemized.
export type CreateRecipeRecord = Omit<
  CreateRecipeInput,
  "ingredients" | "steps"
> & {
  ingredients: RecipeLineWrite[];
  steps: RecipeStepWrite[];
  // Set by imports only (e.g. "obsidian:<file>"), never from the form.
  externalRef?: string;
  // Set when a recipe is copied ("adopted") from another book.
  copiedFromRecipeId?: string;
};
export type UpdateRecipeRecord = Omit<
  UpdateRecipeInput,
  "ingredients" | "steps"
> & {
  ingredients?: RecipeLineWrite[];
  steps?: RecipeStepWrite[];
};
