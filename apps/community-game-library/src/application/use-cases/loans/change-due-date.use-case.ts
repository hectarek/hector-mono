import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { lockedLoan } from "@/src/application/use-cases/loans/locked-loan";
import {
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { canMove, moreTimeFrom } from "@/src/entities/loan";

export type IChangeDueDateUseCase = ReturnType<typeof changeDueDateUseCase>;

// Change the due date (C14, R20), the owner's alone, while it's out: to a day after the due date,
// or after today once it's overdue, as C14 offers. The borrower is told the new date.
export const changeDueDateUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "changeDueDate",
  });

  return async (
    loanId: string,
    dueOn: string,
    userId: string,
    today: string,
  ): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      const { loan, actor } = await lockedLoan(
        loansRepository,
        userGamesRepository,
        loanId,
        userId,
        tx,
      );
      if (actor !== "owner") {
        throw new UnauthorizedError("Only its owner changes the due date.");
      }
      if (!canMove(loan, "change-due-date", "owner") || !loan.dueOn) {
        throw new UnauthorizedError();
      }
      if (dueOn <= moreTimeFrom(loan.dueOn, today)) {
        throw new InputParseError("Pick a day after the due date.");
      }
      await loansRepository.update(loan.id, { dueOn }, tx);
      await noticesRepository.add(
        {
          userId: loan.borrowerUserId,
          type: "due-date-changed",
          createdBy: userId,
          loanId: loan.id,
        },
        tx,
      );
      logger.debug("Due date changed", { loanId: loan.id });
    });
  };
};
