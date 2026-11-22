import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { ChangedError, NotFoundError } from "@/src/entities/errors/common";
import type {
  FriendRequest,
  FriendRequestAnswer,
} from "@/src/entities/models/friend-request.model";

export type IAnswerFriendRequestUseCase = ReturnType<
  typeof answerFriendRequestUseCase
>;

// E1's Accept and Decline (R49). Accepting makes the friendship and deletes the request, its
// notice with it. Declining keeps the request as declined: the recipient stops seeing it, and
// its sender, who isn't told, still sees "You asked".
export const answerFriendRequestUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  friendRequestsRepository: IFriendRequestsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "answerFriendRequest",
  });

  return async (
    requestId: string,
    answer: FriendRequestAnswer,
    userId: string,
  ): Promise<FriendRequest> => {
    return transactionManagerService.startTransaction(async (tx) => {
      const request = await friendRequestsRepository.getById(requestId, tx);
      if (!request) {
        throw new ChangedError("request-withdrawn");
      }
      if (request.recipientUserId !== userId) {
        throw new NotFoundError();
      }
      if (request.status !== "waiting") {
        throw new ChangedError("request-answered");
      }
      if (answer === "accept") {
        await friendshipsRepository.add(
          { userId, friendUserId: request.createdBy },
          tx,
        );
        await friendRequestsRepository.remove(requestId, tx);
      } else {
        await friendRequestsRepository.decline(requestId, tx);
      }
      logger.debug("Answered", { friendRequestId: requestId, answer });
      return request;
    });
  };
};
