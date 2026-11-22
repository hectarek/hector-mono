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
  HOLDING_STATUSES,
  type LOAN_PERIOD_DAYS,
  type LoanStatus,
  lineOf,
} from "@/src/entities/loan";

export type IAnswerRequestUseCase = ReturnType<typeof answerRequestUseCase>;

// The owner's answer (C2): yes for a period or until a picked date, or no, with an optional note.
// The note goes on the borrower's notice either way (rule 10).
export type RequestAnswer = { note: string | null } & (
  | { answer: "yes"; periodDays: (typeof LOAN_PERIOD_DAYS)[number] }
  | { answer: "yes"; dueOn: string }
  | { answer: "no" }
);

const lent: readonly LoanStatus[] = [...HOLDING_STATUSES, "accepted"];

// Answer a request (R16, D4; C2). Only the copy's owner answers, and anyone else, the admin
// included, is refused (AE7). Yes goes to the first request in line while the copy is home, for a
// week, two weeks or a month counted from the pick-up, or until a date after today; the borrower is
// told. No goes to any request. A note to the borrower travels only on their notice. Under the copy's
// lock, a request withdrawn or answered meanwhile, or a yes to someone else first, is Changed
// underneath (KTD6, KTD16), so two answers at once can't both land.
export const answerRequestUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "answerRequest",
  });

  return async (
    loanId: string,
    answer: RequestAnswer,
    userId: string,
    today: string,
  ): Promise<void> => {
    if ("dueOn" in answer && answer.dueOn <= today) {
      throw new InputParseError("Pick a day after today.");
    }
    await transactionManagerService.startTransaction(async (tx) => {
      const { loan, copy, actor } = await lockedLoan(
        loansRepository,
        userGamesRepository,
        loanId,
        userId,
        tx,
      );
      if (actor !== "owner") {
        throw new UnauthorizedError("Only its owner answers a request.");
      }
      if (loan.status === "withdrawn") {
        throw new ChangedError("request-withdrawn");
      }
      if (!canMove(loan, "decline", "owner")) {
        throw new ChangedError("request-answered");
      }
      const answeredAt = new Date();

      if (answer.answer === "no") {
        await loansRepository.update(
          loan.id,
          { status: "declined", answeredAt },
          tx,
        );
        await noticesRepository.add(
          {
            userId: loan.borrowerUserId,
            type: "request-declined",
            createdBy: userId,
            loanId: loan.id,
            answerNote: answer.note,
          },
          tx,
        );
        logger.debug("Declined", { loanId: loan.id });
        return;
      }

      const open = await loansRepository.listOpenForCopies([copy.id], tx);
      if (open.some((one) => lent.includes(one.status))) {
        throw new ChangedError("copy-lent");
      }
      if (lineOf(open)[0]?.id !== loan.id) {
        throw new UnauthorizedError("Answer the first in line first.");
      }
      await loansRepository.update(
        loan.id,
        {
          status: "accepted",
          answeredAt,
          ...("dueOn" in answer
            ? { dueOn: answer.dueOn }
            : { periodDays: answer.periodDays }),
        },
        tx,
      );
      await noticesRepository.add(
        {
          userId: loan.borrowerUserId,
          type: "request-accepted",
          createdBy: userId,
          loanId: loan.id,
          answerNote: answer.note,
        },
        tx,
      );
      logger.debug("Accepted", { loanId: loan.id });
    });
  };
};
