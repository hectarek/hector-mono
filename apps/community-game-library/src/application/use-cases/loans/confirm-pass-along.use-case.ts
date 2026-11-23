import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { lockedLoan } from "@/src/application/use-cases/loans/locked-loan";
import {
  ChangedError,
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import {
  canMove,
  datesAtPickUp,
  PASS_ALONG_FOLLOW_ONS,
} from "@/src/entities/loan";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IConfirmPassAlongUseCase = ReturnType<
  typeof confirmPassAlongUseCase
>;

// The next friend's "I have it" (R48, AE9), with the day: from the day it was handed on to today.
// Their loan is out from that day for the giver's period, counted from that day (D5), not what was
// left of the giver's; the giver's loan ends as passed along that day; and the owner is told who
// has it. One the giver took back, or the owner called back, meanwhile is Changed underneath;
// confirming twice changes nothing.
export const confirmPassAlongUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "confirmPassAlong",
  });

  return async (
    loanId: string,
    pickedUpOn: string,
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
        throw new UnauthorizedError("Only the friend it’s handed to says so.");
      }
      if (loan.status === "out") {
        return;
      }
      const giver =
        loan.previousLoanId === null
          ? undefined
          : await loansRepository.getById(loan.previousLoanId, tx);
      const followOn = PASS_ALONG_FOLLOW_ONS["confirm-pass-along"];
      if (
        loan.status !== followOn.from ||
        !giver ||
        !canMove(giver, "confirm-pass-along", "next-in-line")
      ) {
        throw new ChangedError("request-withdrawn");
      }
      const handedOn = todayIn(
        PLAN_TIME_ZONE,
        loan.answeredAt ?? loan.updatedAt,
      );
      if (pickedUpOn < handedOn || pickedUpOn > today) {
        throw new InputParseError("Pick a day from the handoff to today.");
      }
      await loansRepository.update(
        giver.id,
        { status: "passed-along", returnedOn: pickedUpOn },
        tx,
      );
      await loansRepository.update(
        loan.id,
        {
          status: followOn.to,
          pickedUpOn,
          ...datesAtPickUp(loan, pickedUpOn),
        },
        tx,
      );
      await noticesRepository.add(
        {
          userId: copy.userId,
          type: "passed-along",
          createdBy: userId,
          loanId: loan.id,
        },
        tx,
      );
      logger.debug("Passed along", { loanId: loan.id, from: giver.id });
    });
  };
};
