import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import {
  friendsOfFriends,
  type PersonYouMayKnow,
} from "@/src/application/use-cases/friends/people-you-may-know";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IListFriendsUseCase = ReturnType<typeof listFriendsUseCase>;

export type FriendRequestRow = {
  requestId: string;
  person: NameAndPiece;
  // A friend you share, when there's one: "Friend of Alice".
  via: NameAndPiece | null;
};

export type FriendsList = {
  // Waiting for your answer: Accept or Decline.
  requestsToYou: FriendRequestRow[];
  // Yours, waiting or declined: a declined one still reads "You asked", so its sender isn't told
  // (R49).
  requestsYouSent: FriendRequestRow[];
  // By name, each with how many copies they own: "2 games", "No games yet".
  friends: { person: NameAndPiece; games: number }[];
  // Anyone you've asked shows under your requests instead.
  peopleYouMayKnow: PersonYouMayKnow[];
};

const byName = (a: { person: NameAndPiece }, b: { person: NameAndPiece }) =>
  a.person.name.localeCompare(b.person.name) ||
  (a.person.userId < b.person.userId ? -1 : 1);

// Friends (E1). Each read waits for the one before (KTD2).
export const listFriendsUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  friendRequestsRepository: IFriendRequestsRepository,
  userProfilesRepository: IUserProfilesRepository,
  userGamesRepository: IUserGamesRepository,
  gameNightsRepository: IGameNightsRepository,
) => {
  const repositories = {
    friendships: friendshipsRepository,
    friendRequests: friendRequestsRepository,
    userProfiles: userProfilesRepository,
    gameNights: gameNightsRepository,
  };

  return async (userId: string): Promise<FriendsList> => {
    const { people, viaOf, requests } = await friendsOfFriends(
      repositories,
      userId,
    );
    const friendIds = await friendshipsRepository.listFriendIds(userId);
    const asking = requests.filter(
      (request) =>
        request.recipientUserId === userId && request.status === "waiting",
    );
    const asked = requests.filter((request) => request.createdBy === userId);
    const profiles = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...friendIds,
          ...asking.map((request) => request.createdBy),
          ...asked.map((request) => request.recipientUserId),
        ])
      ).map((person) => [person.userId, person]),
    );
    // Your friends' copies are among the ones you see; counting them needs no other read.
    const copies = await userGamesRepository.listVisible(userId);

    const row = (requestId: string, personId: string): FriendRequestRow[] => {
      const person = profiles.get(personId);
      return person
        ? [{ requestId, person, via: viaOf.get(personId) ?? null }]
        : [];
    };
    return {
      requestsToYou: asking.flatMap((request) =>
        row(request.id, request.createdBy),
      ),
      requestsYouSent: asked.flatMap((request) =>
        row(request.id, request.recipientUserId),
      ),
      friends: friendIds
        .flatMap((friendId) => {
          const person = profiles.get(friendId);
          return person
            ? [
                {
                  person,
                  games: copies.filter((copy) => copy.userId === friendId)
                    .length,
                },
              ]
            : [];
        })
        .sort(byName),
      peopleYouMayKnow: people.filter(
        (person) => person.yourRequestId === null,
      ),
    };
  };
};
