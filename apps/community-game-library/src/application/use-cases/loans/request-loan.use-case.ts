import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireFriend } from "@/src/application/use-cases/friends/require-friend";
import {
  ChangedError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { HOLDING_STATUSES, type LoanStatus, lineOf } from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";

export type IRequestLoanUseCase = ReturnType<typeof requestLoanUseCase>;

const lent: readonly LoanStatus[] = [...HOLDING_STATUSES, "accepted"];

// Ask to borrow (R16; C1): a request for a friend's lendable copy, with an optional note, which
// its owner is told of. Only a copy that isn't lent can be asked for this way: one said yes to or
// out in the meantime is Changed underneath, with Join the line as its next step (U15). One that
// someone else asked for first takes the request behind theirs, and the owner is told someone
// joined the line. Asking twice keeps the first request.
export const requestLoanUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "requestLoan",
  });

  return async (
    input: { userGameId: string; note: string | null },
    userId: string,
  ): Promise<Loan> =>
    transactionManagerService.startTransaction(async (tx) => {
      await userGamesRepository.lock(input.userGameId, tx);
      const copy = await userGamesRepository.getById(input.userGameId, tx);
      if (!copy || copy.userId === userId) {
        throw new NotFoundError();
      }
      await requireFriend(friendshipsRepository, userId, copy.userId, tx);
      if (!copy.lendable) {
        throw new UnauthorizedError("This copy isn’t lent.");
      }
      const open = await loansRepository.listOpenForCopies([copy.id], tx);
      const mine = open.find((loan) => loan.borrowerUserId === userId);
      if (mine) {
        return mine;
      }
      if (open.some((loan) => lent.includes(loan.status))) {
        throw new ChangedError("copy-lent");
      }
      const ahead = lineOf(open).length > 0;
      const loan = await loansRepository.create(
        {
          userGameId: copy.id,
          borrowerUserId: userId,
          requestNote: input.note,
        },
        tx,
      );
      await noticesRepository.add(
        {
          userId: copy.userId,
          type: ahead ? "line-joined" : "loan-requested",
          createdBy: userId,
          loanId: loan.id,
        },
        tx,
      );
      logger.debug("Requested", { loanId: loan.id, inLine: ahead });
      return loan;
    });
};
