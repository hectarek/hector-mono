import type { LoanStatus } from "@/src/entities/loan";
import type {
  Loan,
  LoanChanges,
  NewLoan,
} from "@/src/entities/models/loan.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Loans of copies (docs/data-model.md, loans), read by copy, for copies the caller may already
// see. src/entities/loan.ts turns them into a copy's state and line. U10 adds the first write,
// for unfriending; Batch 4 adds the rest. Every write comes after the use case has locked the
// copy (IUserGamesRepository.lock) and checked the move with canMove (KTD6).
export interface ILoansRepository {
  // A loan by id, whoever's it is: the caller checks the member is its owner or its borrower.
  getById(id: string, tx?: ITransaction): Promise<Loan | undefined>;
  // A request (U12), 'requested' until it's answered. The database refuses a second open loan
  // by one borrower on one copy.
  create(loan: NewLoan, tx: ITransaction): Promise<Loan>;
  // A move that changes more than the status, such as a yes with its period or date. The
  // database refuses a second yes waiting for its pick-up on one copy.
  update(id: string, changes: LoanChanges, tx: ITransaction): Promise<Loan>;
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
  // How many times each copy was picked up, the loan out now included (B12's Most borrowed),
  // by copy id; a copy never picked up isn't listed.
  countPickedUpForCopies(
    userGameIds: readonly string[],
    tx?: ITransaction,
  ): Promise<{ userGameId: string; count: number }[]>;
  // Loans by id, whoever's they are: a notice's loan, or a pass-along's previous one. The caller
  // has already checked the member may see them.
  listByIds(ids: readonly string[], tx?: ITransaction): Promise<Loan[]>;
  // A member's own open loans as the borrower, oldest first.
  listOpenForBorrower(userId: string, tx?: ITransaction): Promise<Loan[]>;
  // A move that changes only the status, such as a withdrawal or a cancellation, written after
  // the use case has locked the copy and checked the move with canMove (KTD6).
  setStatus(
    loanId: string,
    status: LoanStatus,
    tx: ITransaction,
  ): Promise<void>;
}
