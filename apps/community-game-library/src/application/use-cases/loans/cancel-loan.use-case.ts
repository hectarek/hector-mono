import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { lockedLoan } from "@/src/application/use-cases/loans/locked-loan";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  canMove,
  HOLDING_STATUSES,
  type LoanStatus,
} from "@/src/entities/loan";

export type ICancelLoanUseCase = ReturnType<typeof cancelLoanUseCase>;

const holding: readonly LoanStatus[] = HOLDING_STATUSES;

// Call off a yes before the pick-up (R21): the owner's Cancel this loan (C17) or the borrower's
// I can't pick it up after all (C3). The other side is told. One called off already stays as it
// is; one picked up meanwhile can't be.
export const cancelLoanUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "cancelLoan" });

  return async (loanId: string, userId: string): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      const { loan, copy, actor } = await lockedLoan(
        loansRepository,
        userGamesRepository,
        loanId,
        userId,
        tx,
      );
      if (loan.status === "cancelled") {
        return;
      }
      if (!canMove(loan, "cancel", actor)) {
        throw new UnauthorizedError(
          holding.includes(loan.status)
            ? "It’s been picked up already."
            : undefined,
        );
      }
      await loansRepository.setStatus(loan.id, "cancelled", tx);
      await noticesRepository.add(
        {
          userId: actor === "owner" ? loan.borrowerUserId : copy.userId,
          type: "loan-cancelled",
          createdBy: userId,
          loanId: loan.id,
        },
        tx,
      );
      logger.debug("Cancelled", { loanId: loan.id, by: actor });
    });
  };
};
