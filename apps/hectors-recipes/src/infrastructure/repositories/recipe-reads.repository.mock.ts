import type { IRecipeReadsRepository } from "@/src/application/repositories/recipe-reads.repository.interface";
import type { RecipeSource } from "@/src/entities/models/recipe-draft.model";

export class MockRecipeReadsRepository implements IRecipeReadsRepository {
  readonly reads: {
    id: string;
    userId: string;
    kind: RecipeSource["kind"];
    createdAt: Date;
  }[] = [];

  // No await between the count and the push, so concurrent calls can't interleave.
  async record(
    userId: string,
    kind: RecipeSource["kind"],
    { since, limit }: { since: Date; limit: number },
  ): Promise<string | null> {
    const made = this.reads.filter(
      (read) => read.userId === userId && read.createdAt >= since,
    ).length;
    if (made >= limit) return null;
    const id = crypto.randomUUID();
    this.reads.push({ id, userId, kind, createdAt: new Date() });
    return id;
  }

  async remove(id: string): Promise<void> {
    const at = this.reads.findIndex((read) => read.id === id);
    if (at >= 0) this.reads.splice(at, 1);
  }
}
