import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import {
  friendsOfFriends,
  type PersonYouMayKnow,
} from "@/src/application/use-cases/friends/people-you-may-know";

export type IListPeopleYouMayKnowUseCase = ReturnType<
  typeof listPeopleYouMayKnowUseCase
>;

// Step 2 of setting up (A5): the people your new friend knows, with Add friend, or "You asked"
// once you've asked.
export const listPeopleYouMayKnowUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  friendRequestsRepository: IFriendRequestsRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  const repositories = {
    friendships: friendshipsRepository,
    friendRequests: friendRequestsRepository,
    userProfiles: userProfilesRepository,
  };
  return async (userId: string): Promise<PersonYouMayKnow[]> =>
    (await friendsOfFriends(repositories, userId)).people;
};
