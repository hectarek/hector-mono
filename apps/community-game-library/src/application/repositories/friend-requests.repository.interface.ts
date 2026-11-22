import type { FriendRequest } from "@/src/entities/models/friend-request.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// One-tap friend requests (docs/data-model.md, friend_requests; R49): one per pair of people,
// either way round. Accepting or cancelling deletes one; a declined one stays, so its sender
// still sees "You asked".
export interface IFriendRequestsRepository {
  // A second request between the same two people, either way round, is refused.
  add(
    request: Pick<FriendRequest, "createdBy" | "recipientUserId">,
    tx: ITransaction,
  ): Promise<FriendRequest>;
  getById(id: string, tx?: ITransaction): Promise<FriendRequest | undefined>;
  // The pair's one request, whichever of the two sent it.
  getBetween(
    userId: string,
    otherUserId: string,
    tx?: ITransaction,
  ): Promise<FriendRequest | undefined>;
  // Every request a member sent or was sent, waiting or declined, oldest first.
  listInvolving(userId: string, tx?: ITransaction): Promise<FriendRequest[]>;
  decline(id: string, tx: ITransaction): Promise<void>;
  // Its notice goes with it.
  remove(id: string, tx: ITransaction): Promise<void>;
  removeBetween(
    userId: string,
    otherUserId: string,
    tx: ITransaction,
  ): Promise<void>;
}
