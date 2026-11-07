import type { Block, BlockFacts } from "@/src/entities/models/block.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// A block as it's written: its facts and its day, which the use cases work out from its start
// (blockDay).
export type NewBlock = BlockFacts & { day: string };

// An owner's Focus blocks (docs/build-plan.md U17). Every method takes the owner's id (KTD2).
export interface IBlocksRepository {
  add(ownerId: string, block: NewBlock, tx: ITransaction): Promise<Block>;
  get(ownerId: string, id: string): Promise<Block | undefined>;
  // The block, read for a change: it stays locked until the transaction ends.
  getForUpdate(
    ownerId: string,
    id: string,
    tx: ITransaction,
  ): Promise<Block | undefined>;
  // Sets the given facts and moves updatedAt on. The use case has read the block first.
  update(
    ownerId: string,
    id: string,
    changes: Partial<NewBlock>,
    tx: ITransaction,
  ): Promise<Block>;
  delete(ownerId: string, id: string, tx: ITransaction): Promise<void>;
  // The blocks on the days from `from` to `to`, both included: by start, then title.
  listBetween(ownerId: string, from: string, to: string): Promise<Block[]>;
}
