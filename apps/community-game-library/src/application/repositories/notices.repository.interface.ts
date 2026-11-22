import type { NewNotice, Notice } from "@/src/entities/models/notice.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { NoticeType } from "@/src/entities/notice-types";

// What members are told (docs/data-model.md, notices). A notice is written by the change that
// causes it, in that change's transaction, one for each person told (KTD7), so the transaction
// isn't optional. U11 adds the inbox's reads.
export interface INoticesRepository {
  add(notice: NewNotice, tx: ITransaction): Promise<Notice>;
  // A member's latest notices, newest first (F1), at most INBOX_LIMIT.
  listForUser(userId: string, tx?: ITransaction): Promise<Notice[]>;
  // How many of these types the member hasn't seen: the bell's count.
  countUnread(
    userId: string,
    types: readonly NoticeType[],
    tx?: ITransaction,
  ): Promise<number>;
  // The member's notices with these ids, seen now (F1, once it's open); one already read keeps
  // when it was read.
  markRead(
    userId: string,
    noticeIds: readonly string[],
    tx: ITransaction,
  ): Promise<void>;
}

// The inbox shows a member's latest hundred notices; older ones stay, unseen by anyone.
export const INBOX_LIMIT = 100;
