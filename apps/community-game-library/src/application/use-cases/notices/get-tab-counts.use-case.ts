import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import { shownTypes } from "@/src/application/use-cases/notices/notice-groups";
import { copyState } from "@/src/entities/loan";

export type IGetTabCountsUseCase = ReturnType<typeof getTabCountsUseCase>;

// The shell's counts (D14, KTD7): what waits on the member behind each tab, read from the rows,
// not from notices, so switching a group of notices off changes none of them; and the bell's
// unread notices, which does leave those groups out. Each read waits for the one before (KTD2).
export type TabCounts = {
  // Requests to answer (the first in line on a copy that's home), pick-ups to confirm in a
  // pass-along, returns to confirm, and more-time requests to answer.
  loans: number;
  // Invites by name with no answer, once nights have rows (U19).
  nights: number;
  // Friend requests waiting for the member.
  friends: number;
  unread: number;
};

export const getTabCountsUseCase = (
  noticesRepository: INoticesRepository,
  userSettingsRepository: IUserSettingsRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  friendRequestsRepository: IFriendRequestsRepository,
) => {
  return async (userId: string, today: string): Promise<TabCounts> => {
    const unread = await noticesRepository.countUnread(
      userId,
      await shownTypes(userSettingsRepository, userId),
    );

    const copies = await userGamesRepository.listOwn(userId);
    const onCopies = await loansRepository.listOpenForCopies(
      copies.map((copy) => copy.id),
    );
    const requests = copies.filter(
      (copy) =>
        copyState(
          copy,
          onCopies.filter((loan) => loan.userGameId === copy.id),
          userId,
          today,
        ).kind === "requested",
    ).length;
    const returns = onCopies.filter(
      (loan) => loan.status === "returning",
    ).length;
    const moreTime = onCopies.filter(
      (loan) => loan.moreTimeAskedAt !== null,
    ).length;

    const handedOn = (await loansRepository.listOpenForBorrower(userId)).filter(
      (loan) => loan.status === "accepted" && loan.previousLoanId,
    );
    const previous = await loansRepository.listByIds(
      handedOn.flatMap((loan) =>
        loan.previousLoanId ? [loan.previousLoanId] : [],
      ),
    );
    const passAlongs = handedOn.filter((loan) =>
      previous.some(
        (one) => one.id === loan.previousLoanId && one.status === "passing",
      ),
    ).length;

    const friends = (
      await friendRequestsRepository.listInvolving(userId)
    ).filter(
      (request) =>
        request.recipientUserId === userId && request.status === "waiting",
    ).length;

    return {
      loans: requests + passAlongs + returns + moreTime,
      nights: 0,
      friends,
      unread,
    };
  };
};
