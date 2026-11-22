import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { FRIEND_LINK_DAYS, newLinkToken } from "@/src/entities/link-token";
import type { FriendLink } from "@/src/entities/models/friend-link.model";

export type IGetFriendLinkUseCase = ReturnType<typeof getFriendLinkUseCase>;

const DAY_MS = 24 * 60 * 60 * 1000;

// A new link from now, a week long (R49).
export function freshLink(now: Date) {
  return {
    token: newLinkToken(),
    expiresAt: new Date(now.getTime() + FRIEND_LINK_DAYS * DAY_MS),
  };
}

// Your friend link (E2). A member who has none yet, or whose link has run out, gets a new one
// here: an expired link works for nobody, so making the next needs no ask first.
export const getFriendLinkUseCase = (
  friendLinksRepository: IFriendLinksRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getFriendLink",
  });

  return async (userId: string, now: Date): Promise<FriendLink> => {
    const link = await friendLinksRepository.getByUserId(userId);
    if (link && link.expiresAt > now) {
      return link;
    }
    const { token, expiresAt } = freshLink(now);
    const made = await transactionManagerService.startTransaction((tx) =>
      friendLinksRepository.set(userId, token, expiresAt, tx),
    );
    logger.debug("Made a friend link", { userId });
    return made;
  };
};
