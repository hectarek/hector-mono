import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IListTakenPiecesUseCase = ReturnType<typeof listTakenPiecesUseCase>;

// "Taken by your friends" (A4, E6): each friend's piece, by name. Two friends can share one.
export const listTakenPiecesUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string): Promise<NameAndPiece[]> => {
    const friends = await userProfilesRepository.getManyByUserIds(
      await friendshipsRepository.listFriendIds(userId),
    );
    return friends.sort((a, b) => a.name.localeCompare(b.name));
  };
};
