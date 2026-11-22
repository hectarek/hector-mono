import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { FriendRequest } from "@/src/entities/models/friend-request.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type PersonYouMayKnow = {
  person: NameAndPiece;
  // The friend you share, first by name: "Friend of Alice".
  via: NameAndPiece;
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

// People you may know (R49; E1, A5): your friends' friends who aren't your friends yet, by name,
// each with a friend you share. Anyone who asked you is left out, since their request shows on
// its own; anyone you asked keeps their row, with your request. People from a night you went to
// join them when nights have rows (U19). Each read waits for the one before (KTD2).
export async function friendsOfFriends(
  repositories: {
    friendships: IFriendshipsRepository;
    friendRequests: IFriendRequestsRepository;
    userProfiles: IUserProfilesRepository;
  },
  userId: string,
): Promise<FriendsOfFriends> {
  const rows = await repositories.friendships.listFriendsOfFriends(userId);
  const requests = await repositories.friendRequests.listInvolving(userId);
  const people = new Map(
    (
      await repositories.userProfiles.getManyByUserIds([
        ...new Set(rows.flatMap((row) => [row.userId, row.viaUserId])),
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

  const list = [...viaOf].flatMap(([personId, via]): PersonYouMayKnow[] => {
    const person = people.get(personId);
    const request = requests.find(
      (row) => row.createdBy === personId || row.recipientUserId === personId,
    );
    if (!person || request?.createdBy === personId) {
      return [];
    }
    return [{ person, via, yourRequestId: request?.id ?? null }];
  });
  return {
    people: list.sort((a, b) => byName(a.person, b.person)),
    viaOf,
    requests,
  };
}
