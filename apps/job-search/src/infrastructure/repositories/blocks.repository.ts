import { and, asc, between, eq, sql } from "drizzle-orm";
import { blocks } from "@/db/schema";
import type {
  IBlocksRepository,
  NewBlock,
} from "@/src/application/repositories/blocks.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { Block } from "@/src/entities/models/block.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import {
  BaseRepository,
  nextUpdatedAt,
} from "@/src/infrastructure/repositories/base.repository";

export class BlocksRepository
  extends BaseRepository
  implements IBlocksRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "blocks");
  }

  async add(
    ownerId: string,
    block: NewBlock,
    tx: ITransaction,
  ): Promise<Block> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(blocks)
        .values({ ownerId, ...block })
        .returning();
      if (!row) {
        throw new DatabaseOperationError("add returned no block");
      }
      return toBlock(row);
    } catch (err) {
      this.handleError(err, "add", { ownerId });
    }
  }

  async get(ownerId: string, id: string): Promise<Block | undefined> {
    try {
      const [row] = await this.getDbContext()
        .select()
        .from(blocks)
        .where(and(eq(blocks.ownerId, ownerId), eq(blocks.id, id)));
      return row && toBlock(row);
    } catch (err) {
      this.handleError(err, "get", { ownerId, blockId: id });
    }
  }

  async getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Block | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(blocks)
        .where(and(eq(blocks.ownerId, ownerId), eq(blocks.id, id)))
        .for("update");
      return row && toBlock(row);
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId, blockId: id });
    }
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<NewBlock>,
    tx: ITransaction,
  ): Promise<Block> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(blocks)
        .set({ ...changes, updatedAt: nextUpdatedAt(blocks.updatedAt) })
        .where(and(eq(blocks.ownerId, ownerId), eq(blocks.id, id)))
        .returning();
      if (!row) {
        throw new DatabaseOperationError("update found no block");
      }
      return toBlock(row);
    } catch (err) {
      this.handleError(err, "update", { ownerId, blockId: id });
    }
  }

  async delete(ownerId: string, id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(blocks)
        .where(and(eq(blocks.ownerId, ownerId), eq(blocks.id, id)));
    } catch (err) {
      this.handleError(err, "delete", { ownerId, blockId: id });
    }
  }

  async listBetween(
    ownerId: string,
    from: string,
    to: string,
  ): Promise<Block[]> {
    try {
      const rows = await this.getDbContext()
        .select()
        .from(blocks)
        .where(and(eq(blocks.ownerId, ownerId), between(blocks.day, from, to)))
        .orderBy(
          asc(blocks.startsAt),
          sql`${blocks.title} collate "C"`,
          blocks.id,
        );
      return rows.map(toBlock);
    } catch (err) {
      this.handleError(err, "listBetween", { ownerId });
    }
  }
}

function toBlock(row: typeof blocks.$inferSelect): Block {
  return {
    id: row.id,
    day: row.day,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    effort: row.effort,
    title: row.title,
    doneWhen: row.doneWhen,
    state: row.state,
    whatHappened: row.whatHappened,
    updatedAt: row.updatedAt,
  };
}
