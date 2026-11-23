import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { lockedLoan } from "@/src/application/use-cases/loans/locked-loan";
import {
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { canMove, datesAtPickUp } from "@/src/entities/loan";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IConfirmPickUpUseCase = ReturnType<typeof confirmPickUpUseCase>;

// "I've picked it up" (C3), or the owner's "Priya has it" (C17, R18's audit line), with the day:
// from the day of the yes to today, and not after a date the owner picked. The loan is out from
// that day, due its period later, or on the picked date, whose days from the pick-up become its
// period (datesAtPickUp, D5). Once one side has confirmed, the other's confirmation changes nothing.
export const confirmPickUpUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "confirmPickUp",
  });

  return async (
    loanId: string,
    pickedUpOn: string,
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
      if (loan.status === "out") {
        return;
      }
      if (!canMove(loan, "confirm-pick-up", actor)) {
        throw new UnauthorizedError(
          loan.status === "cancelled" ? "This loan was called off." : undefined,
        );
      }
      const said = todayIn(PLAN_TIME_ZONE, loan.answeredAt ?? loan.createdAt);
      const last = loan.dueOn && loan.dueOn < today ? loan.dueOn : today;
      if (pickedUpOn < said || pickedUpOn > last) {
        throw new InputParseError("Pick a day from the yes to today.");
      }
      await loansRepository.update(
        loan.id,
        {
          status: "out",
          pickedUpOn,
          ...datesAtPickUp(loan, pickedUpOn),
        },
        tx,
      );
      logger.debug("Picked up", { loanId: loan.id, by: actor });
    });
  };
};
