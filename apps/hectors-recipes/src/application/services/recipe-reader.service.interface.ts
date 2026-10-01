import type {
  RecipeDraft,
  RecipeSource,
} from "@/src/entities/models/recipe-draft.model";

export interface IRecipeReaderService {
  // Transcribes the recipe in the source, itemized; it never invents what isn't there.
  // Throws RecipeReadError, whose reason says what the person can do about it. Hold its
  // values to the source with itemizing-check.ts: a schema only holds the model to a shape.
  read(source: RecipeSource): Promise<RecipeDraft>;
}
