import type { GroceryChanges } from "@/src/entities/grocery-merge";
import type { GroceryItem } from "@/src/entities/models/grocery-item.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export interface IGroceryItemsRepository {
  // Oldest first: the list reads in the order things were added.
  list(spaceId: string, tx?: ITransaction): Promise<GroceryItem[]>;
  getById(id: string): Promise<GroceryItem | undefined>;
  addText(spaceId: string, text: string, createdBy: string): Promise<void>;
  applyChanges(
    spaceId: string,
    changes: GroceryChanges,
    createdBy: string,
    tx: ITransaction,
  ): Promise<void>;
  // Holds the list for the rest of the transaction, so two adds at once take turns: each reads
  // what's on the list after the other has written (D45).
  lockList(spaceId: string, tx: ITransaction): Promise<void>;
  setChecked(id: string, checked: boolean): Promise<void>;
  // New text for an item, which then counts as typed in: no parsed amount, so nothing
  // merges into it later.
  updateText(id: string, text: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteChecked(spaceId: string): Promise<number>;
}
