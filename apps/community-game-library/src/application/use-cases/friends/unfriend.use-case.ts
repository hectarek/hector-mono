import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import {
  fillSeats,
  leaveTable,
} from "@/src/application/use-cases/nights/night-seats";
import { ChangedError } from "@/src/entities/errors/common";
import { canMove } from "@/src/entities/loan";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { isUpcoming } from "@/src/entities/night";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IUnfriendUseCase = ReturnType<typeof unfriendUseCase>;

// Unfriend (R50 and its audit line; E4). Nobody is told. In one transaction:
// - both friendship rows go, and a friend request between them
// - each one's requests for the other's copies are withdrawn, which takes them out of the
//   other's lines, and a yes not picked up yet is cancelled
// - a loan that's out stays, seen by both until the game is back
// - each comes off the other's game nights coming up, with their games on the table and their
//   votes, and the seats that opens go to the waitlist (R31, U19)
export const unfriendUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  friendRequestsRepository: IFriendRequestsRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
  gameNightsRepository: IGameNightsRepository,
  noticesRepository: INoticesRepository,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "unfriend" });

  // The host's nights coming up that the other is on, each left under its lock: the other's
  // games and votes go, then their row, and the waitlist takes the seats.
  async function leaveNights(host: string, other: string, tx: ITransaction) {
    const now = new Date();
    const today = todayIn(PLAN_TIME_ZONE, now);
    const nights = (
      await gameNightsRepository.listVisibleFrom(
        other,
        new Date(now.getTime() - 36 * 60 * 60 * 1000),
        tx,
      )
    ).filter(
      (night) => night.createdBy === host && isUpcoming(night.startsAt, today),
    );
    for (const night of nights) {
      await gameNightsRepository.lock(night.id, tx);
      if (!(await gameNightsRepository.getAttendee(night.id, other, tx))) {
        continue;
      }
      await leaveTable(
        gameNightsRepository,
        userGamesRepository,
        night.id,
        other,
        tx,
      );
      await gameNightsRepository.removeAttendee(night.id, other, tx);
      await fillSeats(gameNightsRepository, noticesRepository, night, tx);
    }
  }

  // The open loans on the owner's copies to this borrower that unfriending ends, each moved after
  // its copy's lock and checked with canMove (KTD6), as the loan stands once locked.
  async function endLoans(owner: string, borrower: string, tx: ITransaction) {
    const copies = await userGamesRepository.listOwn(owner, tx);
    const loans = await loansRepository.listOpenForCopies(
      copies.map((copy) => copy.id),
      tx,
    );
    for (const { id, userGameId } of loans.filter(
      (loan) => loan.borrowerUserId === borrower,
    )) {
      await userGamesRepository.lock(userGameId, tx);
      const [loan] = (
        await loansRepository.listOpenForCopies([userGameId], tx)
      ).filter((one) => one.id === id);
      if (loan && canMove(loan, "withdraw", "borrower")) {
        await loansRepository.setStatus(id, "withdrawn", tx);
      } else if (loan && canMove(loan, "cancel", "owner")) {
        await loansRepository.setStatus(id, "cancelled", tx);
      }
    }
  }

  return async (friendId: string, userId: string): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      if (!(await friendshipsRepository.areFriends(userId, friendId, tx))) {
        throw new ChangedError("not-friends");
      }
      await friendshipsRepository.remove(userId, friendId, tx);
      await friendRequestsRepository.removeBetween(userId, friendId, tx);
      await endLoans(friendId, userId, tx);
      await endLoans(userId, friendId, tx);
      await leaveNights(friendId, userId, tx);
      await leaveNights(userId, friendId, tx);
    });
    logger.debug("Unfriended", { userId, friendUserId: friendId });
  };
};
