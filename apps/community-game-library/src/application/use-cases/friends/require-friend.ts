import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// The first step before reading another member's copies, profile, phone, photo or nights
// (docs/build-plan.md KTD4, D10): only their friends get past it. Anyone else gets the Not found
// an id with no account gets, so a stranger can't tell an account exists (AE8). Nobody is their
// own friend: a use case that shows members their own things checks for that first.
export async function requireFriend(
  friendshipsRepository: IFriendshipsRepository,
  viewerId: string,
  otherUserId: string,
  tx?: ITransaction,
): Promise<void> {
  if (!(await friendshipsRepository.areFriends(viewerId, otherUserId, tx))) {
    throw new NotFoundError();
  }
}
