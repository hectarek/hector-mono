import type { ITransaction } from "@/src/entities/models/transaction.model";

// Accounts the admin removed (docs/data-model.md, removed_users; G8): a removed account sees only
// that it was removed (KTD3). U22 adds the removal.
export interface IRemovedUsersRepository {
  isRemoved(userId: string, tx?: ITransaction): Promise<boolean>;
}
