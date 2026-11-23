// Signed-in members for the page, action and gate tests, made through the app's own controllers on
// the container's mock repositories (which live for the whole run, so each test signs in as a new
// user: signInAsNewUser).
import { getInjection } from "@/di/container";
import type { ProfileForm } from "@/src/entities/models/user-profile.model";
import { MockGameNightsRepository } from "@/src/infrastructure/repositories/game-nights.repository.mock";
import { MockGamesRepository } from "@/src/infrastructure/repositories/games.repository.mock";
import { MockLoansRepository } from "@/src/infrastructure/repositories/loans.repository.mock";
import { MockRemovedUsersRepository } from "@/src/infrastructure/repositories/removed-users.repository.mock";
import { MockUserGamesRepository } from "@/src/infrastructure/repositories/user-games.repository.mock";
import { MockFileStorageService } from "@/src/infrastructure/services/mock-file-storage.service";
import { CAST, castRows, writeCastPeople } from "@/tests/_support/cast";
import { nextState, signInAsNewUser } from "@/tests/_support/next";

export const QUINN: ProfileForm = {
  name: "Quinn Sample",
  pieceShape: "cone",
  pieceColor: "teal",
  phone: "555 0123",
};

// Signs in as a new user with a profile, and returns their id.
export async function signInAsMember(
  profile: Partial<ProfileForm> = {},
): Promise<string> {
  const userId = signInAsNewUser();
  await getInjection("ICreateProfileController")(
    { ...QUINN, ...profile },
    userId,
  );
  return userId;
}

// An account the admin removed, with nothing else of it changed, for a gate's test.
export function removeAccount(userId: string): void {
  const removed = getInjection("IRemovedUsersRepository");
  if (removed instanceof MockRemovedUsersRepository)
    removed.userIds.add(userId);
}

// The files stored for one member, in the container's file storage (which lives for the whole
// run, like its repositories).
export function storedFor(userId: string): string[] {
  const storage = getInjection("IFileStorage");
  if (!(storage instanceof MockFileStorageService)) {
    throw new Error("The container's storage is the mock under test");
  }
  return [...storage.files.keys()].filter((key) =>
    key.startsWith(`profile-photos/${userId}/`),
  );
}

// The design canvas's cast in the container's repositories, for a page's test against its board,
// and You signed in. Once per run: the container's mocks keep what's put in them, and the cast's
// ids are fixed. Its people go in through their repositories; the games, copies and loans, which
// have no writes yet, straight into their mocks, as makeCast does.
export async function signInAsYouWithTheCast(): Promise<string> {
  const games = getInjection("IGamesRepository");
  const userGames = getInjection("IUserGamesRepository");
  const loans = getInjection("ILoansRepository");
  const gameNights = getInjection("IGameNightsRepository");
  if (
    !(games instanceof MockGamesRepository) ||
    !(userGames instanceof MockUserGamesRepository) ||
    !(loans instanceof MockLoansRepository) ||
    !(gameNights instanceof MockGameNightsRepository)
  ) {
    throw new Error("The container's repositories are the mocks under test");
  }
  if (games.rows.length === 0) {
    const rows = castRows();
    await getInjection("ITransactionManagerService").startTransaction((tx) =>
      writeCastPeople(
        rows,
        {
          userProfiles: getInjection("IUserProfilesRepository"),
          userSettings: getInjection("IUserSettingsRepository"),
          friendships: getInjection("IFriendshipsRepository"),
          friendRequests: getInjection("IFriendRequestsRepository"),
        },
        tx,
        { commit: true },
      ),
    );
    games.rows.push(...rows.games);
    userGames.rows.push(...rows.copies);
    userGames.expansions.push(...rows.expansions);
    loans.rows.push(...rows.loans);
    gameNights.nights.push(...rows.nights);
    gameNights.attendees.push(...rows.nightAttendees);
    gameNights.games.push(...rows.nightGames);
    gameNights.votes.push(...rows.nightVotes);
  }
  nextState.userId = CAST.people.you.id;
  return CAST.people.you.id;
}

// Puts the cast's nights back as the boards draw them, with their lists, tables and votes, for a
// screen test file whose tests answer, invite or vote: the container's repositories live for the
// whole run.
export function resetCastNights(): void {
  const gameNights = getInjection("IGameNightsRepository");
  if (!(gameNights instanceof MockGameNightsRepository)) {
    throw new Error("The container's repositories are the mocks under test");
  }
  const rows = castRows();
  gameNights.nights.splice(0, gameNights.nights.length, ...rows.nights);
  gameNights.attendees.splice(
    0,
    gameNights.attendees.length,
    ...rows.nightAttendees,
  );
  gameNights.games.splice(0, gameNights.games.length, ...rows.nightGames);
  gameNights.votes.splice(0, gameNights.votes.length, ...rows.nightVotes);
}
