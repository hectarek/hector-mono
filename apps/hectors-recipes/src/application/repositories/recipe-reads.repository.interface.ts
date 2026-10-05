import type { RecipeSource } from "@/src/entities/models/recipe-draft.model";

export interface IRecipeReadsRepository {
  // Records an AI read unless this person has made `limit` since `since`, as one step, so
  // reads at once can't all slip under the limit (D48). The new read's id, or null.
  record(
    userId: string,
    kind: RecipeSource["kind"],
    window: { since: Date; limit: number },
  ): Promise<string | null>;
  // Takes back a read that cost nothing (refused before the model saw anything).
  remove(id: string): Promise<void>;
}
