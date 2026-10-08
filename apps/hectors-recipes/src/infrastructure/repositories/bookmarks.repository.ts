import { and, desc, eq } from "drizzle-orm";
import { recipeBookmarks } from "@/db/schema";
import type { IBookmarksRepository } from "@/src/application/repositories/bookmarks.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class BookmarksRepository
  extends BaseRepository
  implements IBookmarksRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "bookmarks");
  }

  async listRecipeIds(userId: string, tx?: ITransaction): Promise<string[]> {
    try {
      const rows = await this.getDbContext(tx)
        .select({ recipeId: recipeBookmarks.recipeId })
        .from(recipeBookmarks)
        .where(eq(recipeBookmarks.userId, userId))
        .orderBy(desc(recipeBookmarks.createdAt));
      return rows.map((row) => row.recipeId);
    } catch (err) {
      this.handleError(err, "listRecipeIds", { userId });
    }
  }

  async set(
    userId: string,
    recipeId: string,
    saved: boolean,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      const db = this.getDbContext(tx);
      if (saved) {
        await db
          .insert(recipeBookmarks)
          .values({ userId, recipeId })
          .onConflictDoNothing();
      } else {
        await db
          .delete(recipeBookmarks)
          .where(
            and(
              eq(recipeBookmarks.userId, userId),
              eq(recipeBookmarks.recipeId, recipeId),
            ),
          );
      }
    } catch (err) {
      this.handleError(err, "set", { userId, recipeId, saved });
    }
  }
}
