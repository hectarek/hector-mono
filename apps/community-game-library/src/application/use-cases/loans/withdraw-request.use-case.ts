import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { lockedLoan } from "@/src/application/use-cases/loans/locked-loan";
import { tellWhoseTurn } from "@/src/application/use-cases/loans/the-line";
import { ChangedError, NotFoundError } from "@/src/entities/errors/common";
import {
  canMove,
  HOLDING_STATUSES,
  type LoanStatus,
  lineOf,
} from "@/src/entities/loan";

export type IWithdrawRequestUseCase = ReturnType<typeof withdrawRequestUseCase>;

const lent: readonly LoanStatus[] = [...HOLDING_STATUSES, "accepted"];

// Withdraw a request (R21; C16), or leave a line (C10), by its borrower while it's still a request.
// The owner is told when it was theirs to answer: first in line, with the copy home and no yes
// waiting. Leaving a line otherwise tells the owner nothing, and whoever moves up to first is told
// their turn is coming up. A request answered meanwhile is Changed underneath; one withdrawn
// already stays as it is.
export const withdrawRequestUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "withdrawRequest",
  });

  return async (loanId: string, userId: string): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      const { loan, copy, actor } = await lockedLoan(
        loansRepository,
        userGamesRepository,
        loanId,
        userId,
        tx,
      );
      if (actor !== "borrower") {
        throw new NotFoundError();
      }
      if (loan.status === "withdrawn") {
        return;
      }
      if (!canMove(loan, "withdraw", "borrower")) {
        throw new ChangedError("request-answered");
      }
      const open = await loansRepository.listOpenForCopies([copy.id], tx);
      const [first = null] = lineOf(open);
      const theirsToAnswer =
        first?.id === loan.id && !open.some((one) => lent.includes(one.status));
      await loansRepository.setStatus(loan.id, "withdrawn", tx);
      await tellWhoseTurn(
        loansRepository,
        noticesRepository,
        { copyId: copy.id, before: first, userId },
        tx,
      );
      if (theirsToAnswer) {
        await noticesRepository.add(
          {
            userId: copy.userId,
            type: "request-withdrawn",
            createdBy: userId,
            loanId: loan.id,
          },
          tx,
        );
      }
      logger.debug("Withdrawn", { loanId: loan.id });
    });
  };
};
