import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { FriendLink } from "@/src/entities/models/friend-link.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IOpenFriendLinkUseCase = ReturnType<typeof openFriendLinkUseCase>;

// The link at a token, while it works: an expired or replaced one is Not found, and its page says
// "This link no longer works" (screens.md).
export async function workingLink(
  friendLinksRepository: IFriendLinksRepository,
  token: string,
  now: Date,
): Promise<FriendLink> {
  const link = await friendLinksRepository.getByToken(token);
  if (!link || link.expiresAt <= now) {
    throw new NotFoundError();
  }
  return link;
}

// Opening a friend link, signed in (R49, KTD18): the two are friends at once, both ways, and a
// request between them is done with. It's sent from the page as it opens, never on the page's
// own load, since link previews and prefetching load addresses on their own (recipes' join
// links). The link's owner may have left since: then it's Not found too.
export const openFriendLinkUseCase = (
  friendLinksRepository: IFriendLinksRepository,
  friendshipsRepository: IFriendshipsRepository,
  friendRequestsRepository: IFriendRequestsRepository,
  userProfilesRepository: IUserProfilesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "openFriendLink",
  });

  return async (
    token: string,
    userId: string,
    now: Date,
  ): Promise<NameAndPiece> => {
    const link = await workingLink(friendLinksRepository, token, now);
    if (link.userId === userId) {
      throw new InputParseError("That’s your own friend link");
    }
    const [friend] = await userProfilesRepository.getManyByUserIds([
      link.userId,
    ]);
    if (!friend) {
      throw new NotFoundError();
    }
    await transactionManagerService.startTransaction(async (tx) => {
      await friendshipsRepository.add(
        { userId, friendUserId: link.userId },
        tx,
      );
      await friendRequestsRepository.removeBetween(userId, link.userId, tx);
    });
    logger.debug("Friends by a link", { userId, friendUserId: link.userId });
    return friend;
  };
};
