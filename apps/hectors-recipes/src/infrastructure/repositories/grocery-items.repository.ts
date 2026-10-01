import { and, asc, eq, max, sql } from "drizzle-orm";
import { groceryItems, ingredients } from "@/db/schema";
import type { IGroceryItemsRepository } from "@/src/application/repositories/grocery-items.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { GroceryChanges } from "@/src/entities/grocery-merge";
import type { GroceryItem } from "@/src/entities/models/grocery-item.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

const itemColumns = {
  id: groceryItems.id,
  spaceId: groceryItems.spaceId,
  text: groceryItems.text,
  checked: groceryItems.checked,
  quantity: groceryItems.quantity,
  unit: groceryItems.unit,
  ingredientId: groceryItems.ingredientId,
  sourceNote: groceryItems.sourceNote,
  createdAt: groceryItems.createdAt,
  aisle: ingredients.aisle,
};

export class GroceryItemsRepository
  extends BaseRepository
  implements IGroceryItemsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "grocery-items");
  }

  async list(spaceId: string, tx?: ITransaction): Promise<GroceryItem[]> {
    try {
      return await this.getDbContext(tx)
        .select(itemColumns)
        .from(groceryItems)
        .leftJoin(ingredients, eq(ingredients.id, groceryItems.ingredientId))
        .where(eq(groceryItems.spaceId, spaceId))
        .orderBy(asc(groceryItems.createdAt), asc(groceryItems.id));
    } catch (err) {
      this.handleError(err, "list", { spaceId });
    }
  }

  async getById(
    id: string,
    tx?: ITransaction,
  ): Promise<GroceryItem | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select(itemColumns)
        .from(groceryItems)
        .leftJoin(ingredients, eq(ingredients.id, groceryItems.ingredientId))
        .where(eq(groceryItems.id, id));
      return row;
    } catch (err) {
      this.handleError(err, "getById", { id });
    }
  }

  async addText(
    spaceId: string,
    text: string,
    createdBy: string,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      const executor = this.getDbContext(tx);
      await executor.insert(groceryItems).values({
        spaceId,
        text,
        createdBy,
        createdAt: new Date(await this.nextCreatedAt(executor, spaceId)),
      });
    } catch (err) {
      this.handleError(err, "addText", { spaceId });
    }
  }

  async applyChanges(
    spaceId: string,
    changes: GroceryChanges,
    createdBy: string,
    tx: ITransaction,
  ): Promise<void> {
    const executor = this.getDbContext(tx);
    try {
      if (changes.inserts.length) {
        // One insert shares a single now(); step the timestamps so a recipe's
        // ingredients keep their order on the list (it's sorted by created_at).
        const start = await this.nextCreatedAt(executor, spaceId);
        await executor.insert(groceryItems).values(
          changes.inserts.map((item, index) => ({
            ...item,
            spaceId,
            createdBy,
            createdAt: new Date(start + index),
          })),
        );
      }
      for (const update of changes.updates) {
        await executor
          .update(groceryItems)
          .set({
            text: update.text,
            quantity: update.quantity,
            sourceNote: update.sourceNote,
          })
          .where(
            and(
              eq(groceryItems.id, update.id),
              eq(groceryItems.spaceId, spaceId),
            ),
          );
      }
    } catch (err) {
      this.handleError(err, "applyChanges", { spaceId });
    }
  }

  // When the next item on a list is stamped: now, or just after the newest item already there,
  // whichever is later. Every insert goes through it, so an item always lands below the ones
  // before it, even when a recipe's stepped timestamps run past now (or the clock lags).
  private async nextCreatedAt(
    executor: ReturnType<typeof this.getDbContext>,
    spaceId: string,
  ): Promise<number> {
    const [latest] = await executor
      .select({ createdAt: max(groceryItems.createdAt) })
      .from(groceryItems)
      .where(eq(groceryItems.spaceId, spaceId));
    return Math.max(Date.now(), (latest?.createdAt?.getTime() ?? 0) + 1);
  }

  async lockList(spaceId: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx).execute(
        sql`select pg_advisory_xact_lock(hashtext(${`grocery-list:${spaceId}`}))`,
      );
    } catch (err) {
      this.handleError(err, "lockList", { spaceId });
    }
  }

  async setChecked(
    id: string,
    checked: boolean,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(groceryItems)
        .set({ checked })
        .where(eq(groceryItems.id, id));
    } catch (err) {
      this.handleError(err, "setChecked", { id });
    }
  }

  async updateText(id: string, text: string, tx?: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(groceryItems)
        .set({ text, quantity: null, unit: null, ingredientId: null })
        .where(eq(groceryItems.id, id));
    } catch (err) {
      this.handleError(err, "updateText", { id });
    }
  }

  async delete(id: string, tx?: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(groceryItems)
        .where(eq(groceryItems.id, id));
    } catch (err) {
      this.handleError(err, "delete", { id });
    }
  }

  async deleteChecked(spaceId: string, tx?: ITransaction): Promise<number> {
    try {
      const removed = await this.getDbContext(tx)
        .delete(groceryItems)
        .where(
          and(
            eq(groceryItems.spaceId, spaceId),
            eq(groceryItems.checked, true),
          ),
        )
        .returning({ id: groceryItems.id });
      return removed.length;
    } catch (err) {
      this.handleError(err, "deleteChecked", { spaceId });
    }
  }
}
