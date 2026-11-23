import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { Loan } from "@/src/entities/models/loan.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { UserGame } from "@/src/entities/models/user-game.model";

// Where a move of a loan starts (KTD6): its copy's row lock, then the loan read again under it, so
// two moves on one copy wait for each other and the second sees what the first did. It also says
// who the member is to the loan, its copy's owner or its borrower; anyone else, the admin
// included, gets the Not found a stranger gets (D4, AE7, AE8).
export async function lockedLoan(
  loansRepository: ILoansRepository,
  userGamesRepository: IUserGamesRepository,
  loanId: string,
  userId: string,
  tx: ITransaction,
): Promise<{ loan: Loan; copy: UserGame; actor: "owner" | "borrower" }> {
  const found = await loansRepository.getById(loanId, tx);
  if (!found) {
    throw new NotFoundError();
  }
  await userGamesRepository.lock(found.userGameId, tx);
  const loan = await loansRepository.getById(loanId, tx);
  const copy = await userGamesRepository.getById(found.userGameId, tx);
  if (!loan || !copy) {
    throw new NotFoundError();
  }
  if (copy.userId === userId) {
    return { loan, copy, actor: "owner" };
  }
  if (loan.borrowerUserId === userId) {
    return { loan, copy, actor: "borrower" };
  }
  throw new NotFoundError();
}
