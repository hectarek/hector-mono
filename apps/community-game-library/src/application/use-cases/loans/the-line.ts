import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import { lineOf } from "@/src/entities/loan";
import type { Loan, LoanChanges } from "@/src/entities/models/loan.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// The first request in a copy's line (R24), read under the copy's lock, or null.
export async function firstInLine(
  loansRepository: ILoansRepository,
  copyId: string,
  tx: ITransaction,
): Promise<Loan | null> {
  return (
    lineOf(await loansRepository.listOpenForCopies([copyId], tx))[0] ?? null
  );
}

// Whose turn is coming up (R26; data-model.md's turn-in-line). After a move that can change who's
// first in a copy's line (a request withdrawn, declined or said yes to, a pass-along handed on,
// taken back or called back), whoever is first now and wasn't before is told, unless they made the
// move or the move told them already. `before` is firstInLine read before the move. Someone already
// first when the copy comes home isn't told again: the owner's answer tells them.
export async function tellWhoseTurn(
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  move: {
    copyId: string;
    before: Loan | null;
    userId: string;
    told?: readonly string[];
  },
  tx: ITransaction,
): Promise<void> {
  const first = await firstInLine(loansRepository, move.copyId, tx);
  if (
    !first ||
    first.id === move.before?.id ||
    first.borrowerUserId === move.userId ||
    move.told?.includes(first.borrowerUserId)
  ) {
    return;
  }
  await noticesRepository.add(
    {
      userId: first.borrowerUserId,
      type: "turn-in-line",
      createdBy: move.userId,
      loanId: first.id,
    },
    tx,
  );
}

// A pass-along's next loan going back in line, when the giver takes it back or the owner calls the
// game back (R48): a request again, in the place it asked for, without the giver's period, so the
// owner's next yes sets its own.
export const BACK_IN_LINE = {
  status: "requested",
  previousLoanId: null,
  periodDays: null,
  answeredAt: null,
} as const satisfies LoanChanges;
