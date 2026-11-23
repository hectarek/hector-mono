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
import { canMove, lineOf } from "@/src/entities/loan";

export type IConfirmReturnUseCase = ReturnType<typeof confirmReturnUseCase>;

// The owner's answer to Is it back? (C8): yes, on a day, with anything new missing or damaged, or
// not yet.
export type ReturnAnswer =
  | { answer: "back"; returnedOn: string; note: string | null }
  | { answer: "not-yet" };

// Is it back? (C8; R19, D15), the owner's alone. Yes, it's back closes the loan on the day given,
// from the pick-up to today, and adds anything new missing or damaged to the copy's note, so the
// next borrower knows; it also marks a loan that's out as back without waiting. It answers with
// the next request in the copy's line, which the owner is asked to answer: that friend, already
// first in line, hears from the owner's answer (the-line.ts).
// I don't have it yet puts a loan that's being returned back out, and tells the borrower.
export const confirmReturnUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "confirmReturn",
  });

  return async (
    loanId: string,
    answer: ReturnAnswer,
    userId: string,
    today: string,
  ): Promise<{ nextInLine: string | null }> =>
    transactionManagerService.startTransaction(async (tx) => {
      const { loan, copy, actor } = await lockedLoan(
        loansRepository,
        userGamesRepository,
        loanId,
        userId,
        tx,
      );
      if (actor !== "owner") {
        throw new UnauthorizedError("Only its owner says it's back.");
      }
      const next = async () =>
        lineOf(await loansRepository.listOpenForCopies([copy.id], tx))[0]?.id ??
        null;

      if (answer.answer === "not-yet") {
        if (loan.status !== "out") {
          if (!canMove(loan, "not-back-yet", "owner")) {
            throw new UnauthorizedError();
          }
          await loansRepository.update(
            loan.id,
            { status: "out", returnedOn: null },
            tx,
          );
          await noticesRepository.add(
            {
              userId: loan.borrowerUserId,
              type: "return-not-confirmed",
              createdBy: userId,
              loanId: loan.id,
            },
            tx,
          );
          logger.debug("Not back yet", { loanId: loan.id });
        }
        return { nextInLine: null };
      }

      if (loan.status === "returned") {
        return { nextInLine: await next() };
      }
      if (!canMove(loan, "confirm-return", "owner")) {
        throw new UnauthorizedError();
      }
      if (
        answer.returnedOn > today ||
        (loan.pickedUpOn ?? today) > answer.returnedOn
      ) {
        throw new InputParseError("Pick a day from the pick-up to today.");
      }
      await loansRepository.update(
        loan.id,
        { status: "returned", returnedOn: answer.returnedOn },
        tx,
      );
      if (answer.note) {
        await userGamesRepository.update(
          copy.id,
          {
            conditionNote: copy.conditionNote
              ? `${copy.conditionNote}${/[.!?]$/.test(copy.conditionNote) ? " " : "; "}${answer.note}`
              : answer.note,
          },
          tx,
        );
      }
      logger.debug("Back", { loanId: loan.id, noted: answer.note !== null });
      return { nextInLine: await next() };
    });
};
