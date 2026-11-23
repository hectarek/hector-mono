import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { lockedLoan } from "@/src/application/use-cases/loans/locked-loan";
import {
  BACK_IN_LINE,
  firstInLine,
  tellWhoseTurn,
} from "@/src/application/use-cases/loans/the-line";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { canMove, PASS_ALONG_FOLLOW_ONS } from "@/src/entities/loan";

export type ITakeBackPassAlongUseCase = ReturnType<
  typeof takeBackPassAlongUseCase
>;

// The giver's "I still have it" (R48's audit line), while the next friend hasn't confirmed: both
// loans go back as they were, the giver's out again and the next friend's a request in its place
// in line (BACK_IN_LINE), and the next friend is told. Taking it back twice changes nothing.
export const takeBackPassAlongUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "takeBackPassAlong",
  });

  return async (loanId: string, userId: string): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      const { loan, copy, actor } = await lockedLoan(
        loansRepository,
        userGamesRepository,
        loanId,
        userId,
        tx,
      );
      if (actor !== "borrower") {
        throw new UnauthorizedError("Only the borrower takes it back.");
      }
      if (loan.status === "out") {
        return;
      }
      if (!canMove(loan, "take-back", "borrower")) {
        throw new UnauthorizedError();
      }
      const before = await firstInLine(loansRepository, copy.id, tx);
      const followOn = PASS_ALONG_FOLLOW_ONS["take-back"];
      const next = (
        await loansRepository.listOpenForCopies([copy.id], tx)
      ).find(
        (one) => one.previousLoanId === loan.id && one.status === followOn.from,
      );
      await loansRepository.update(loan.id, { status: "out" }, tx);
      if (next) {
        await loansRepository.update(next.id, BACK_IN_LINE, tx);
        await noticesRepository.add(
          {
            userId: next.borrowerUserId,
            type: "pass-along-taken-back",
            createdBy: userId,
            loanId: next.id,
          },
          tx,
        );
      }
      await tellWhoseTurn(
        loansRepository,
        noticesRepository,
        {
          copyId: copy.id,
          before,
          userId,
          told: next ? [next.borrowerUserId] : [],
        },
        tx,
      );
      logger.debug("Taken back", { loanId: loan.id });
    });
  };
};
