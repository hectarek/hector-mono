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
import { canMove } from "@/src/entities/loan";

export type IAnswerMoreTimeUseCase = ReturnType<typeof answerMoreTimeUseCase>;

// The owner's answer to a request for more time (C13): yes until the date asked, yes until a date
// of their own after today, or no, which keeps the due date. Either way the note travels on the
// borrower's notice (rule 10).
export type MoreTimeAnswer = { note: string | null } & (
  | { answer: "yes" }
  | { answer: "yes"; dueOn: string }
  | { answer: "no" }
);

// Answer more time (C13, R20), the owner's alone. Either answer clears the request's three
// columns, and the borrower is told. A request a call-back closed meanwhile is Changed underneath.
export const answerMoreTimeUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "answerMoreTime",
  });

  return async (
    loanId: string,
    answer: MoreTimeAnswer,
    userId: string,
    today: string,
  ): Promise<void> => {
    if ("dueOn" in answer && answer.dueOn <= today) {
      throw new InputParseError("Pick a day after today.");
    }
    await transactionManagerService.startTransaction(async (tx) => {
      const { loan, actor } = await lockedLoan(
        loansRepository,
        userGamesRepository,
        loanId,
        userId,
        tx,
      );
      if (actor !== "owner") {
        throw new UnauthorizedError("Only its owner answers.");
      }
      if (!canMove(loan, "answer-more-time", "owner")) {
        throw new ChangedError("request-answered");
      }
      const dueOn =
        answer.answer === "no"
          ? loan.dueOn
          : "dueOn" in answer
            ? answer.dueOn
            : loan.moreTimeDueOn;
      await loansRepository.update(
        loan.id,
        {
          dueOn,
          moreTimeDueOn: null,
          moreTimeNote: null,
          moreTimeAskedAt: null,
        },
        tx,
      );
      await noticesRepository.add(
        {
          userId: loan.borrowerUserId,
          type: "more-time-answered",
          createdBy: userId,
          loanId: loan.id,
          answerNote: answer.note,
        },
        tx,
      );
      logger.debug("More time answered", {
        loanId: loan.id,
        answer: answer.answer,
      });
    });
  };
};
