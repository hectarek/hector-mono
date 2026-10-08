import { and, count, eq, gte, sql } from "drizzle-orm";
import { recipeReads } from "@/db/schema";
import type { IRecipeReadsRepository } from "@/src/application/repositories/recipe-reads.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { RecipeSource } from "@/src/entities/models/recipe-draft.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class RecipeReadsRepository
  extends BaseRepository
  implements IRecipeReadsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "recipeReads");
  }

  async record(
    userId: string,
    kind: RecipeSource["kind"],
    { since, limit }: { since: Date; limit: number },
  ): Promise<string | null> {
    try {
      // One person's reads take turns, so the count and the insert can't interleave.
      return await this.getDbContext().transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`recipe-reads:${userId}`}))`,
        );
        const [made] = await tx
          .select({ reads: count() })
          .from(recipeReads)
          .where(
            and(
              eq(recipeReads.userId, userId),
              gte(recipeReads.createdAt, since),
            ),
          );
        if ((made?.reads ?? 0) >= limit) return null;
        const [read] = await tx
          .insert(recipeReads)
          .values({ userId, kind })
          .returning({ id: recipeReads.id });
        return read?.id ?? null;
      });
    } catch (err) {
      this.handleError(err, "record", { userId, kind });
    }
  }

  async count(userId: string, since: Date): Promise<number> {
    try {
      const [made] = await this.getDbContext()
        .select({ reads: count() })
        .from(recipeReads)
        .where(
          and(
            eq(recipeReads.userId, userId),
            gte(recipeReads.createdAt, since),
          ),
        );
      return made?.reads ?? 0;
    } catch (err) {
      this.handleError(err, "count", { userId });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.getDbContext()
        .delete(recipeReads)
        .where(eq(recipeReads.id, id));
    } catch (err) {
      this.handleError(err, "remove", { id });
    }
  }
}
