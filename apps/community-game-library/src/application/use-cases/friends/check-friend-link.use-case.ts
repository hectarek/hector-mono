import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import { workingLink } from "@/src/application/use-cases/friends/open-friend-link.use-case";

export type ICheckFriendLinkUseCase = ReturnType<typeof checkFriendLinkUseCase>;

// What A3 shows a signed-out visitor of a working link: only the day it stops working, since a
// signed-out page names no member (R39). A link that doesn't work is Not found.
export const checkFriendLinkUseCase = (
  friendLinksRepository: IFriendLinksRepository,
) => {
  return async (token: string, now: Date): Promise<{ expiresAt: Date }> => {
    const { expiresAt } = await workingLink(friendLinksRepository, token, now);
    return { expiresAt };
  };
};
