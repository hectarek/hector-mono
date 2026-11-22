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
  // Writes both rows, and is a no-op for two people who are friends already. A friendship with
  // oneself is refused.
  add(userId: string, friendUserId: string, tx?: ITransaction): Promise<void>;
  // Deletes both rows.
  remove(
    userId: string,
    friendUserId: string,
    tx?: ITransaction,
  ): Promise<void>;
}
