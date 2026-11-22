import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { lockedLoan } from "@/src/application/use-cases/loans/locked-loan";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { canMove, PASS_ALONG_FOLLOW_ONS } from "@/src/entities/loan";

export type ICallBackUseCase = ReturnType<typeof callBackUseCase>;

// Call it back (C15, R20), the owner's alone, after the dialog: the loan is due today if it was
// due later, a waiting request for more time closes, and any pass-along ends, the next friend's
// yes going back to a request in line (PASS_ALONG_FOLLOW_ONS), so the game can only come back to
// its owner. The borrower is told; C18 then offers to text them too (R52).
export const callBackUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "callBack" });

  return async (
    loanId: string,
    userId: string,
    today: string,
  ): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      const { loan, copy, actor } = await lockedLoan(
        loansRepository,
        userGamesRepository,
        loanId,
        userId,
        tx,
      );
      if (actor !== "owner") {
        throw new UnauthorizedError("Only its owner calls it back.");
      }
      if (loan.calledBackAt) {
        return;
      }
      if (!canMove(loan, "call-back", "owner")) {
        throw new UnauthorizedError();
      }
      if (loan.status === "passing") {
        const followOn = PASS_ALONG_FOLLOW_ONS["call-back"];
        for (const next of await loansRepository.listOpenForCopies(
          [copy.id],
          tx,
        )) {
          if (
            next.previousLoanId === loan.id &&
            next.status === followOn.from
          ) {
            await loansRepository.update(
              next.id,
              { status: followOn.to, previousLoanId: null },
              tx,
            );
          }
        }
      }
      await loansRepository.update(
        loan.id,
        {
          status: "out",
          returnedOn: null,
          calledBackAt: new Date(),
          dueOn: loan.dueOn && loan.dueOn < today ? loan.dueOn : today,
          moreTimeDueOn: null,
          moreTimeNote: null,
          moreTimeAskedAt: null,
        },
        tx,
      );
      await noticesRepository.add(
        {
          userId: loan.borrowerUserId,
          type: "called-back",
          createdBy: userId,
          loanId: loan.id,
        },
        tx,
      );
      logger.debug("Called back", { loanId: loan.id });
    });
  };
};
