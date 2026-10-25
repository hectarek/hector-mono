import type {
  ActivityFilter,
  ActivityPage,
  NewActivityEntry,
} from "@/src/entities/models/activity.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export interface IActivityRepository {
  // Appends one change inside the write's own transaction, so the change and its history
  // commit or roll back together (docs/build-plan.md KTD7).
  add(entry: NewActivityEntry, tx: ITransaction): Promise<void>;
  // An owner's changes, newest first, a page at a time. Given a transaction, it reads inside it,
  // so it sees that transaction's own writes.
  list(
    ownerId: string,
    filter: ActivityFilter,
    tx?: ITransaction,
  ): Promise<ActivityPage>;
}
