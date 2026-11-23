import type { FriendLink } from "@/src/entities/models/friend-link.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Each member's one friend link (docs/data-model.md, friend_links; R49, E2).
export interface IFriendLinksRepository {
  getByUserId(
    userId: string,
    tx?: ITransaction,
  ): Promise<FriendLink | undefined>;
  // Expired or not: the use case says whether it still works.
  getByToken(token: string, tx?: ITransaction): Promise<FriendLink | undefined>;
  // Makes the member's link, or replaces its token and date, so the old link stops working.
  set(
    userId: string,
    token: string,
    expiresAt: Date,
    tx: ITransaction,
  ): Promise<FriendLink>;

  // An account's end (U22).
  remove(userId: string, tx: ITransaction): Promise<void>;
}
