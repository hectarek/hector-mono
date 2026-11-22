import type { Loan } from "@/src/entities/models/loan.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Loans of copies (docs/data-model.md, loans), read by copy, for copies the caller may already
// see. src/entities/loan.ts turns them into a copy's state and line. Batch 4 adds the writes.
export interface ILoansRepository {
  // Each copy's open loans, from the request until it ends ('requested' to 'passing'), oldest
  // first.
  listOpenForCopies(
    userGameIds: readonly string[],
    tx?: ITransaction,
  ): Promise<Loan[]>;
  // The loan that has the copy now ('out', 'returning' or 'passing'), if one does: at most one
  // can.
  getCurrentForCopy(
    userGameId: string,
    tx?: ITransaction,
  ): Promise<Loan | undefined>;
  // The copy's history (B7): its loans that were picked up, the one out now included, newest
  // pick-up first.
  listHistoryForCopy(userGameId: string, tx?: ITransaction): Promise<Loan[]>;
}
