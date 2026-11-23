import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireFriend } from "@/src/application/use-cases/friends/require-friend";
import { tellWhoseTurn } from "@/src/application/use-cases/loans/the-line";
import {
  ChangedError,
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import {
  datesAtPickUp,
  HOLDING_STATUSES,
  type LOAN_PERIOD_DAYS,
  type LoanStatus,
  lineOf,
} from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";

export type IRecordLoanUseCase = ReturnType<typeof recordLoanUseCase>;

// What C9 records: the copy, the friend taking it, the day they picked it up, and a week, two
// weeks, a month or a date.
export type LoanToRecord = {
  userGameId: string;
  borrowerUserId: string;
  pickedUpOn: string;
} & ({ periodDays: (typeof LOAN_PERIOD_DAYS)[number] } | { dueOn: string });

const lent: readonly LoanStatus[] = [...HOLDING_STATUSES, "accepted"];

// Record a loan (C9, R17), for one made face to face, with no request: the owner lends a copy of
// theirs that's lent and home to a friend, from the pick-up day given, today or earlier, for a
// period counted from that day or until a date after today. It's out from that day, and the friend
// is told and doesn't confirm. A friend who'd asked for it has their request become the loan, and
// whoever was behind them is first in line now. A copy said yes to or out meanwhile is Changed
// underneath; one that isn't lent is refused.
export const recordLoanUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "recordLoan" });

  return async (
    input: LoanToRecord,
    userId: string,
    today: string,
  ): Promise<Loan> => {
    if (input.pickedUpOn > today) {
      throw new InputParseError("Pick a day up to today.");
    }
    if ("dueOn" in input && input.dueOn <= today) {
      throw new InputParseError("Pick a date after today.");
    }
    return transactionManagerService.startTransaction(async (tx) => {
      await userGamesRepository.lock(input.userGameId, tx);
      const copy = await userGamesRepository.getById(input.userGameId, tx);
      if (!copy || copy.userId !== userId) {
        throw new NotFoundError();
      }
      await requireFriend(
        friendshipsRepository,
        userId,
        input.borrowerUserId,
        tx,
      );
      if (!copy.lendable) {
        throw new UnauthorizedError("This copy isn’t lent.");
      }
      const open = await loansRepository.listOpenForCopies([copy.id], tx);
      if (open.some((loan) => lent.includes(loan.status))) {
        throw new ChangedError("copy-lent");
      }
      const before = lineOf(open)[0] ?? null;
      const asked = open.find(
        (loan) => loan.borrowerUserId === input.borrowerUserId,
      );
      const request =
        asked ??
        (await loansRepository.create(
          { userGameId: copy.id, borrowerUserId: input.borrowerUserId },
          tx,
        ));
      const loan = await loansRepository.update(
        request.id,
        {
          status: "out",
          answeredAt: new Date(),
          pickedUpOn: input.pickedUpOn,
          ...datesAtPickUp(
            "dueOn" in input
              ? { periodDays: null, dueOn: input.dueOn }
              : { periodDays: input.periodDays, dueOn: null },
            input.pickedUpOn,
          ),
        },
        tx,
      );
      await noticesRepository.add(
        {
          userId: input.borrowerUserId,
          type: "loan-recorded",
          createdBy: userId,
          loanId: loan.id,
        },
        tx,
      );
      await tellWhoseTurn(
        loansRepository,
        noticesRepository,
        {
          copyId: copy.id,
          before,
          userId,
          told: [input.borrowerUserId],
        },
        tx,
      );
      logger.debug("Recorded", { loanId: loan.id, asked: asked !== undefined });
      return loan;
    });
  };
};
