import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { nightToSee } from "@/src/application/use-cases/nights/can-see-night";
import { mayInvite } from "@/src/application/use-cases/nights/invite-to-night.use-case";
import { UnauthorizedError } from "@/src/entities/errors/common";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IGetInviteChoicesUseCase = ReturnType<
  typeof getInviteChoicesUseCase
>;

// Invite people's Not invited yet (D10): the inviter's friends who aren't on the night's list, by
// name. Only someone who may invite gets them.
export const getInviteChoicesUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    userId: string,
  ): Promise<NameAndPiece[]> => {
    const night = await nightToSee(readers, gameNightId, userId);
    const list = await gameNightsRepository.listAttendees([night.id]);
    if (!mayInvite(night, list, userId)) {
      throw new UnauthorizedError("Only the host invites people.");
    }
    const listed = new Set(list.map((one) => one.userId));
    const friends = (await friendshipsRepository.listFriendIds(userId)).filter(
      (id) => !listed.has(id),
    );
    return (await userProfilesRepository.getManyByUserIds(friends)).sort(
      (a, b) => a.name.localeCompare(b.name) || (a.userId < b.userId ? -1 : 1),
    );
  };
};
