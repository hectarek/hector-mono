import type { NewNotice, Notice } from "@/src/entities/models/notice.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// What members are told (docs/data-model.md, notices). A notice is written by the change that
// causes it, in that change's transaction, one for each person told (KTD7), so the transaction
// isn't optional. U11 adds the inbox's reads.
export interface INoticesRepository {
  add(notice: NewNotice, tx: ITransaction): Promise<Notice>;
}
