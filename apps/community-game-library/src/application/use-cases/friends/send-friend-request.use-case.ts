import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { FriendRequest } from "@/src/entities/models/friend-request.model";

export type ISendFriendRequestUseCase = ReturnType<
  typeof sendFriendRequestUseCase
>;

// Add friend (R49; E1, A5): a one-tap request to a friend's friend, who's told. There's no search
// of everyone, so anyone else is Not found, as a stranger's account is (AE8). People from a night
// you went to can be asked once nights have rows (U19). Asking twice keeps the first request.
export const sendFriendRequestUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  friendRequestsRepository: IFriendRequestsRepository,
  noticesRepository: INoticesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "sendFriendRequest",
  });

  return async (
    recipientUserId: string,
    userId: string,
  ): Promise<FriendRequest> => {
    if (recipientUserId === userId) {
      throw new InputParseError("That’s you");
    }
    return transactionManagerService.startTransaction(async (tx) => {
      if (await friendshipsRepository.areFriends(userId, recipientUserId, tx)) {
        throw new InputParseError("You’re friends already");
      }
      const known = await friendshipsRepository.listFriendsOfFriends(
        userId,
        tx,
      );
      if (!known.some((row) => row.userId === recipientUserId)) {
        throw new NotFoundError();
      }
      const existing = await friendRequestsRepository.getBetween(
        userId,
        recipientUserId,
        tx,
      );
      if (existing?.createdBy === userId) {
        return existing;
      }
      if (existing) {
        throw new InputParseError("They’ve asked you already");
      }
      const request = await friendRequestsRepository.add(
        { createdBy: userId, recipientUserId },
        tx,
      );
      await noticesRepository.add(
        {
          userId: recipientUserId,
          type: "friend-request",
          createdBy: userId,
          friendRequestId: request.id,
        },
        tx,
      );
      logger.debug("Sent", { friendRequestId: request.id });
      return request;
    });
  };
};
