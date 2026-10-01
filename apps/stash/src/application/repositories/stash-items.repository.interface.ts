import type {
  StashItem,
  StashItemInsert,
} from "@/src/entities/models/stash-item.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export interface IStashItemsRepository {
  create(
    item: StashItemInsert,
    position: number,
    tx?: ITransaction,
  ): Promise<StashItem>;
  getForUser(userId: string): Promise<StashItem[]>;
  getById(id: string): Promise<StashItem | undefined>;
  update(
    id: string,
    data: Partial<StashItem>,
    tx?: ITransaction,
  ): Promise<StashItem>;
  delete(id: string, tx?: ITransaction): Promise<void>;
  getMaxPosition(userId: string, tx?: ITransaction): Promise<number>;
}
