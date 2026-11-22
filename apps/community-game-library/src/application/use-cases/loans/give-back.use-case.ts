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
import { canMove } from "@/src/entities/loan";

export type IGiveBackUseCase = ReturnType<typeof giveBackUseCase>;

// "I gave it back to Sam" (C5, R19), by the borrower with the day: from the pick-up to today. The
// loan then waits for the owner, and can't run overdue from that day (D15); the owner is told.
export const giveBackUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "giveBack" });

  return async (
    loanId: string,
    returnedOn: string,
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
        throw new UnauthorizedError("Only the borrower gives it back.");
      }
      if (loan.status === "returning") {
        return;
      }
      if (!canMove(loan, "give-back", "borrower")) {
        throw new UnauthorizedError();
      }
      if (returnedOn > today || (loan.pickedUpOn ?? today) > returnedOn) {
        throw new InputParseError("Pick a day from the pick-up to today.");
      }
      await loansRepository.update(
        loan.id,
        { status: "returning", returnedOn },
        tx,
      );
      await noticesRepository.add(
        {
          userId: copy.userId,
          type: "return-to-confirm",
          createdBy: userId,
          loanId: loan.id,
        },
        tx,
      );
      logger.debug("Given back", { loanId: loan.id });
    });
  };
};
