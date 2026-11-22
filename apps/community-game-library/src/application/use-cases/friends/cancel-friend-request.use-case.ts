import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { ChangedError, NotFoundError } from "@/src/entities/errors/common";

export type ICancelFriendRequestUseCase = ReturnType<
  typeof cancelFriendRequestUseCase
>;

// Cancel request (R49; E1, A5): the sender deletes their request, waiting or declined, and its
// notice goes with it. One accepted meanwhile is gone already: they're friends.
export const cancelFriendRequestUseCase = (
  friendRequestsRepository: IFriendRequestsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "cancelFriendRequest",
  });

  return async (requestId: string, userId: string): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      const request = await friendRequestsRepository.getById(requestId, tx);
      if (!request) {
        throw new ChangedError("request-answered");
      }
      if (request.createdBy !== userId) {
        throw new NotFoundError();
      }
      await friendRequestsRepository.remove(requestId, tx);
    });
    logger.debug("Cancelled", { friendRequestId: requestId });
  };
};
