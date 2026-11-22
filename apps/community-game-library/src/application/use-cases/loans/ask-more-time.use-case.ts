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

export type IAskMoreTimeUseCase = ReturnType<typeof askMoreTimeUseCase>;

// Ask for more time (C6, R20), by the borrower while they have it: a date after the due date, or
// after today once it's overdue, with an optional note; the owner is told. Not on a loan called
// back, and one request at a time.
export const askMoreTimeUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "askMoreTime" });

  return async (
    loanId: string,
    request: { dueOn: string; note: string | null },
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
      if (actor !== "borrower") {
        throw new UnauthorizedError("Only the borrower asks for more time.");
      }
      if (!canMove(loan, "ask-more-time", "borrower") || !loan.dueOn) {
        throw new UnauthorizedError(
          loan.calledBackAt
            ? "It’s been called back."
            : loan.moreTimeAskedAt
              ? "You’ve asked already."
              : undefined,
        );
      }
      if (request.dueOn <= moreTimeFrom(loan.dueOn, today)) {
        throw new InputParseError("Pick a day after the due date.");
      }
      await loansRepository.update(
        loan.id,
        {
          moreTimeDueOn: request.dueOn,
          moreTimeNote: request.note,
          moreTimeAskedAt: new Date(),
        },
        tx,
      );
      await noticesRepository.add(
        {
          userId: copy.userId,
          type: "more-time-asked",
          createdBy: userId,
          loanId: loan.id,
        },
        tx,
      );
      logger.debug("More time asked", { loanId: loan.id });
    });
  };
};
