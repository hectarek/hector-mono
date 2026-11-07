import type {
  IBlocksRepository,
  NewBlock,
} from "@/src/application/repositories/blocks.repository.interface";
import { byCodePoint } from "@/src/entities/code-point-order";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { Block } from "@/src/entities/models/block.model";
import { nextUpdatedAt } from "@/src/infrastructure/repositories/updated-at.mock";

// The blocks in memory, listed as the table lists them: by start, then title by code point,
// then id.
export class MockBlocksRepository implements IBlocksRepository {
  private readonly rows: { ownerId: string; block: Block }[] = [];

  async add(ownerId: string, block: NewBlock): Promise<Block> {
    const added: Block = {
      ...block,
      id: crypto.randomUUID(),
      updatedAt: new Date(),
    };
    this.rows.push({ ownerId, block: added });
    return { ...added };
  }

  async get(ownerId: string, id: string): Promise<Block | undefined> {
    const row = this.rowOf(ownerId, id);
    return row && { ...row.block };
  }

  async getForUpdate(ownerId: string, id: string): Promise<Block | undefined> {
    return this.get(ownerId, id);
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<NewBlock>,
  ): Promise<Block> {
    const row = this.rowOf(ownerId, id);
    if (!row) {
      throw new DatabaseOperationError("update found no block");
    }
    row.block = {
      ...row.block,
      ...changes,
      updatedAt: nextUpdatedAt(row.block.updatedAt),
    };
    return { ...row.block };
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const index = this.rows.findIndex(
      (row) => row.ownerId === ownerId && row.block.id === id,
    );
    if (index >= 0) {
      this.rows.splice(index, 1);
    }
  }

  async listBetween(
    ownerId: string,
    from: string,
    to: string,
  ): Promise<Block[]> {
    return this.rows
      .filter(
        ({ ownerId: owner, block }) =>
          owner === ownerId && block.day >= from && block.day <= to,
      )
      .map(({ block }) => ({ ...block }))
      .sort(
        (a, b) =>
          a.startsAt.getTime() - b.startsAt.getTime() ||
          byCodePoint(a.title, b.title) ||
          byCodePoint(a.id, b.id),
      );
  }

  private rowOf(ownerId: string, id: string) {
    return this.rows.find(
      (row) => row.ownerId === ownerId && row.block.id === id,
    );
  }
}
