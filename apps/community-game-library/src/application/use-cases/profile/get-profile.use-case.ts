import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import { requireFriend } from "@/src/application/use-cases/friends/require-friend";
import { NotFoundError } from "@/src/entities/errors/common";
import type { UserProfile } from "@/src/entities/models/user-profile.model";
import { PHOTO_URL_SECONDS } from "@/src/entities/profile-photo";

export type IGetProfileUseCase = ReturnType<typeof getProfileUseCase>;

export type ProfileView = {
  profile: UserProfile;
  // The photo's signed address, which lasts an hour, or null with no photo.
  photoUrl: string | null;
};

// A whole profile, with the phone and a signed address for the photo (R40, KTD4): the member's
// own, or a friend's, after requireFriend. Anyone else gets the Not found an id with no account
// gets.
export const getProfileUseCase = (
  userProfilesRepository: IUserProfilesRepository,
  friendshipsRepository: IFriendshipsRepository,
  fileStorage: IFileStorage,
) => {
  return async (userId: string, viewerId: string): Promise<ProfileView> => {
    if (userId !== viewerId) {
      await requireFriend(friendshipsRepository, viewerId, userId);
    }
    const profile = await userProfilesRepository.getByUserId(userId);
    if (!profile) {
      throw new NotFoundError();
    }
    const photoUrl = profile.photoKey
      ? await fileStorage.signedUrl(
          "profile-photos",
          profile.photoKey,
          PHOTO_URL_SECONDS,
        )
      : null;
    return { profile, photoUrl };
  };
};
