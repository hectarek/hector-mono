import { eq, max } from "drizzle-orm";
import { stashItems } from "@/db/schema";
import type { IStashItemsRepository } from "@/src/application/repositories/stash-items.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  StashItem,
  StashItemInsert,
} from "@/src/entities/models/stash-item.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class StashItemsRepository
  extends BaseRepository
  implements IStashItemsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "stash-items");
  }

  async create(
    item: StashItemInsert,
    position: number,
    tx?: ITransaction,
  ): Promise<StashItem> {
    const executor = this.getDbContext(tx);
    try {
      const [created] = await executor
        .insert(stashItems)
        .values({
          userId: item.userId,
          url: item.url,
          title: item.title,
          description: item.description ?? null,
          type: item.type ?? "other",
          status: "queued",
          position,
          thumbnailUrl: item.thumbnailUrl ?? null,
          source: item.source ?? null,
        })
        .returning();

      if (!created) {
        throw new DatabaseOperationError("Failed to create stash item");
      }

      this.logger.debug("Created stash item", { id: created.id, position });
      return created as StashItem;
    } catch (err) {
      this.handleError(err, "create", { userId: item.userId });
    }
  }

  async getForUser(userId: string): Promise<StashItem[]> {
    const executor = this.getDbContext();
    try {
      const items = await executor
        .select()
        .from(stashItems)
        .where(eq(stashItems.userId, userId))
        .orderBy(stashItems.position);

      this.logger.debug("Fetched items for user", {
        userId,
        count: items.length,
      });
      return items as StashItem[];
    } catch (err) {
      this.handleError(err, "getForUser", { userId });
    }
  }

  async getById(id: string): Promise<StashItem | undefined> {
    const executor = this.getDbContext();
    try {
      const [item] = await executor
        .select()
        .from(stashItems)
        .where(eq(stashItems.id, id));

      return item as StashItem | undefined;
    } catch (err) {
      this.handleError(err, "getById", { id });
    }
  }

  async update(
    id: string,
    data: Partial<StashItem>,
    tx?: ITransaction,
  ): Promise<StashItem> {
    const executor = this.getDbContext(tx);
    try {
      const [updated] = await executor
        .update(stashItems)
        .set(data)
        .where(eq(stashItems.id, id))
        .returning();

      if (!updated) {
        throw new DatabaseOperationError("Failed to update stash item");
      }

      this.logger.debug("Updated stash item", { id });
      return updated as StashItem;
    } catch (err) {
      this.handleError(err, "update", { id });
    }
  }

  async delete(id: string, tx?: ITransaction): Promise<void> {
    const executor = this.getDbContext(tx);
    try {
      await executor.delete(stashItems).where(eq(stashItems.id, id));
      this.logger.debug("Deleted stash item", { id });
    } catch (err) {
      this.handleError(err, "delete", { id });
    }
  }

  async getMaxPosition(userId: string, tx?: ITransaction): Promise<number> {
    const executor = this.getDbContext(tx);
    try {
      const [result] = await executor
        .select({ maxPos: max(stashItems.position) })
        .from(stashItems)
        .where(eq(stashItems.userId, userId));

      return result?.maxPos ?? -1;
    } catch (err) {
      this.handleError(err, "getMaxPosition", { userId });
    }
  }
}
