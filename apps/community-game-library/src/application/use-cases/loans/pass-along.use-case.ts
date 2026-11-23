import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { lockedLoan } from "@/src/application/use-cases/loans/locked-loan";
import {
  firstInLine,
  tellWhoseTurn,
} from "@/src/application/use-cases/loans/the-line";
import { ChangedError, UnauthorizedError } from "@/src/entities/errors/common";
import { canMove, PASS_ALONG_FOLLOW_ONS } from "@/src/entities/loan";

export type IPassAlongUseCase = ReturnType<typeof passAlongUseCase>;

// "I gave it to Jo" (C11, R48), the borrower's, on a copy whose owner lets friends pass it along,
// while someone's in line and the game hasn't been called back. The giver's loan is passing, which
// can't run overdue (D15), and stays theirs until the next friend confirms; a request for more time
// still waiting closes, since they're done with it. The first request in line is said yes to by
// the owner's switch, for the giver's period (PASS_ALONG_FOLLOW_ONS). The next friend is asked to
// confirm, and whoever is behind them is first in line now. A line that emptied meanwhile is
// Changed underneath; handing it on twice changes nothing.
export const passAlongUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "passAlong" });

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
        throw new UnauthorizedError("Only the borrower hands it on.");
      }
      if (loan.status === "passing") {
        return;
      }
      if (loan.calledBackAt) {
        throw new UnauthorizedError("It’s been called back.");
      }
      if (!canMove(loan, "pass-along", "borrower")) {
        throw new UnauthorizedError();
      }
      if (!copy.passAlong) {
        throw new UnauthorizedError("Pass-along is off for this copy.");
      }
      const next = await firstInLine(loansRepository, copy.id, tx);
      if (!next) {
        throw new ChangedError("request-withdrawn");
      }
      await loansRepository.update(
        loan.id,
        {
          status: "passing",
          moreTimeDueOn: null,
          moreTimeNote: null,
          moreTimeAskedAt: null,
        },
        tx,
      );
      await loansRepository.update(
        next.id,
        {
          status: PASS_ALONG_FOLLOW_ONS["pass-along"].to,
          previousLoanId: loan.id,
          periodDays: loan.periodDays,
          dueOn: null,
          answeredAt: new Date(),
        },
        tx,
      );
      await noticesRepository.add(
        {
          userId: next.borrowerUserId,
          type: "pass-along-to-confirm",
          createdBy: userId,
          loanId: next.id,
        },
        tx,
      );
      await tellWhoseTurn(
        loansRepository,
        noticesRepository,
        {
          copyId: copy.id,
          before: next,
          userId,
          told: [next.borrowerUserId],
        },
        tx,
      );
      logger.debug("Handed on", { loanId: loan.id, nextLoanId: next.id });
    });
  };
};
