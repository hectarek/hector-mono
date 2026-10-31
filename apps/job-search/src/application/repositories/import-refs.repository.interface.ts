import type { RecordRef } from "@/src/entities/models/activity.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// The refs the sheet's import wrote its records under (docs/build-plan.md KTD14, U11): each once
// per owner, so a rerun skips what already landed.
export interface IImportRefsRepository {
  // Every ref the owner's import has written, with the record it names.
  list(ownerId: string): Promise<Map<string, RecordRef>>;
  add(
    ownerId: string,
    ref: string,
    record: RecordRef,
    tx: ITransaction,
  ): Promise<void>;
}
