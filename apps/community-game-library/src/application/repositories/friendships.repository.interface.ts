import type { ITransaction } from "@/src/entities/models/transaction.model";

// Who's friends with whom (docs/data-model.md, friendships): two rows a friendship, one from each
// side, made and removed together, so a member's friends are one lookup. Who sees what follows
// these rows (D10, KTD4).
export interface IFriendshipsRepository {
  areFriends(
    userId: string,
    friendUserId: string,
    tx?: ITransaction,
  ): Promise<boolean>;
  // In id order, so every read gives the same order: a list sorts by what it shows.
  listFriendIds(userId: string, tx?: ITransaction): Promise<string[]>;
  // When the two became friends: E3's "Friends since Jul 2026".
  getSince(
    userId: string,
    friendUserId: string,
    tx?: ITransaction,
  ): Promise<Date | undefined>;
  // People the member's friends are friends with, who aren't the member or their friends yet,
  // each once for every friend they share ("Friend of Alice", E1 and A5): by person, then by the
  // friend, in id order.
  listFriendsOfFriends(
    userId: string,
    tx?: ITransaction,
  ): Promise<{ userId: string; viaUserId: string }[]>;
  // Writes both rows, and is a no-op for two people who are friends already. A friendship with
  // oneself is refused. It's dated now, unless the cast and the seed date it as the boards do.
  add(
    friendship: { userId: string; friendUserId: string; createdAt?: Date },
    tx?: ITransaction,
  ): Promise<void>;
  // Deletes both rows.
  remove(
    userId: string,
    friendUserId: string,
    tx?: ITransaction,
  ): Promise<void>;
}
