import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { freshLink } from "@/src/application/use-cases/friends/get-friend-link.use-case";
import type { FriendLink } from "@/src/entities/models/friend-link.model";

export type IMakeFriendLinkUseCase = ReturnType<typeof makeFriendLinkUseCase>;

// E2's Make a new link, after its dialog: the new token replaces the old, so the link already
// shared stops working (R49).
export const makeFriendLinkUseCase = (
  friendLinksRepository: IFriendLinksRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "makeFriendLink",
  });

  return async (userId: string, now: Date): Promise<FriendLink> => {
    const { token, expiresAt } = freshLink(now);
    const made = await transactionManagerService.startTransaction((tx) =>
      friendLinksRepository.set(userId, token, expiresAt, tx),
    );
    logger.debug("Made a new friend link", { userId });
    return made;
  };
};
