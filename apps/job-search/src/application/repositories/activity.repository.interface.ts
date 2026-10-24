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
  // An owner's changes, newest first, a page at a time.
  list(ownerId: string, filter: ActivityFilter): Promise<ActivityPage>;
}
