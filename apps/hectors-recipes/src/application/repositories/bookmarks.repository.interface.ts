import type { ITransaction } from "@/src/entities/models/transaction.model";

// A person's saved recipes (docs/ux-plan.md D77).
export interface IBookmarksRepository {
  // The recipes this person has saved, newest first.
  listRecipeIds(userId: string, tx?: ITransaction): Promise<string[]>;
  // Saves the recipe for this person, or no longer; saving twice keeps one.
  set(
    userId: string,
    recipeId: string,
    saved: boolean,
    tx?: ITransaction,
  ): Promise<void>;
}
