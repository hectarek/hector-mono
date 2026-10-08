import type { IBookmarksRepository } from "@/src/application/repositories/bookmarks.repository.interface";

export class MockBookmarksRepository implements IBookmarksRepository {
  // Each person's saved recipes, oldest first.
  private readonly saved = new Map<string, string[]>();

  async listRecipeIds(userId: string): Promise<string[]> {
    return [...(this.saved.get(userId) ?? [])].reverse();
  }

  // Saving again keeps the first save's place, as the table's insert does nothing then.
  async set(userId: string, recipeId: string, saved: boolean): Promise<void> {
    const ids = this.saved.get(userId) ?? [];
    if (saved) {
      if (!ids.includes(recipeId)) this.saved.set(userId, [...ids, recipeId]);
    } else {
      this.saved.set(
        userId,
        ids.filter((id) => id !== recipeId),
      );
    }
  }

  // A deleted recipe's bookmarks go with it, as the table's cascade does.
  forgetRecipe(recipeId: string): void {
    for (const [userId, ids] of this.saved) {
      this.saved.set(
        userId,
        ids.filter((id) => id !== recipeId),
      );
    }
  }
}
