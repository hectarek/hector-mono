import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { FriendRequest } from "@/src/entities/models/friend-request.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type PersonYouMayKnow = {
  person: NameAndPiece;
  // The friend you share, first by name: "Friend of Alice".
  via: NameAndPiece | null;
  // Or the last night you went to together: "At Halloween one-shots" (U19).
  night: string | null;
  // Your request to them, once you've sent one: "You asked", with Cancel request.
  yourRequestId: string | null;
};

export type FriendsOfFriends = {
  people: PersonYouMayKnow[];
  // The friend you share with anyone you or they have asked, for their request's row.
  viaOf: Map<string, NameAndPiece>;
  requests: FriendRequest[];
};

const byName = (a: NameAndPiece, b: NameAndPiece) =>
  a.name.localeCompare(b.name) || (a.userId < b.userId ? -1 : 1);

// People you may know (R49; E1, A5): your friends' friends who aren't your friends yet, and the
// people you went to a game night with (U19), by name, each with a friend you share or the last
// night you were at together. Anyone who asked you is left out, since their request shows on its
// own; anyone you asked keeps their row, with your request. Each read waits for the one before
// (KTD2).
export async function friendsOfFriends(
  repositories: {
    friendships: IFriendshipsRepository;
    friendRequests: IFriendRequestsRepository;
    userProfiles: IUserProfilesRepository;
    gameNights: IGameNightsRepository;
  },
  userId: string,
): Promise<FriendsOfFriends> {
  const rows = await repositories.friendships.listFriendsOfFriends(userId);
  const requests = await repositories.friendRequests.listInvolving(userId);
  const friends = new Set(await repositories.friendships.listFriendIds(userId));
  // Newest night first, so each keeps the last one.
  const nightOf = new Map<string, string>();
  for (const row of await repositories.gameNights.listWentWith(
    userId,
    new Date(),
  )) {
    if (!friends.has(row.userId) && !nightOf.has(row.userId)) {
      nightOf.set(row.userId, row.title);
    }
  }
  const people = new Map(
    (
      await repositories.userProfiles.getManyByUserIds([
        ...new Set([
          ...rows.flatMap((row) => [row.userId, row.viaUserId]),
          ...nightOf.keys(),
        ]),
      ])
    ).map((person) => [person.userId, person]),
  );

  const viaOf = new Map<string, NameAndPiece>();
  for (const row of rows) {
    const via = people.get(row.viaUserId);
    const current = viaOf.get(row.userId);
    if (via && (!current || byName(via, current) < 0)) {
      viaOf.set(row.userId, via);
    }
  }

  const known = new Set([...viaOf.keys(), ...nightOf.keys()]);
  const list = [...known].flatMap((personId): PersonYouMayKnow[] => {
    const person = people.get(personId);
    const request = requests.find(
      (row) => row.createdBy === personId || row.recipientUserId === personId,
    );
    if (!person || request?.createdBy === personId) {
      return [];
    }
    const via = viaOf.get(personId) ?? null;
    return [
      {
        person,
        via,
        night: via ? null : (nightOf.get(personId) ?? null),
        yourRequestId: request?.id ?? null,
      },
    ];
  });
  return {
    people: list.sort((a, b) => byName(a.person, b.person)),
    viaOf,
    requests,
  };
}
