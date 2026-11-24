import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { ISignInsRepository } from "@/src/application/repositories/sign-ins.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { cancelAndTell } from "@/src/application/use-cases/nights/cancel-and-tell";
import {
  fillSeats,
  leaveTable,
} from "@/src/application/use-cases/nights/night-seats";
import { ChangedError, NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import { canMove, isUnsettled } from "@/src/entities/loan";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { isUpcoming } from "@/src/entities/night";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// The repositories an account's end writes to, as deleting one's own (E9) and the admin's removal
// (G8) both pass them.
export type AccountRepositories = {
  friendLinks: IFriendLinksRepository;
  friendRequests: IFriendRequestsRepository;
  friendships: IFriendshipsRepository;
  gameNights: IGameNightsRepository;
  loans: ILoansRepository;
  notices: INoticesRepository;
  userGames: IUserGamesRepository;
  userProfiles: IUserProfilesRepository;
  userSettings: IUserSettingsRepository;
  signIns: ISignInsRepository;
};

// Nights that started up to a day and a half ago can still be today in the app's time zone, so
// the reads start there and isUpcoming decides (as unfriending's do).
const DAY_AND_A_HALF_MS = 36 * 60 * 60 * 1000;

// What goes with an account (R41; data-model.md, What goes with a copy or an account), inside the
// deletion's own transaction:
// - refused while a loan of theirs is unsettled, read again under each copy's lock (KTD6)
// - their requests and places in line end, with no notices
// - the nights they host that are coming up are cancelled, and everyone going, invited or
//   waiting is told; they leave other hosts' nights coming up, whose seats go to the waitlist
//   (U19); and their places on other hosts' nights and their votes go
// - their copies go, and the database takes each one's box, loans and places on tables with it
// - their friendships, friend requests either way, friend link, settings, inbox and profile go
// - their sign-in is anonymized, in Neon Auth's tables (ISignInsRepository), so it can't be used
//   again and holds no name, email or picture
// Kept: their past loans of others' copies, the notices others got about them, their suggestions
// and the nights they hosted, all shown with formerMember. Answers their name and their photo's
// key, which leaves storage once the transaction commits (removePhotoFile).
export async function endAccount(
  repositories: AccountRepositories,
  userId: string,
  now: Date,
  tx: ITransaction,
): Promise<{ name: string; photoKey: string | null }> {
  const { gameNights, loans, notices, userGames } = repositories;
  const profile = await repositories.userProfiles.getByUserId(userId, tx);
  if (!profile) {
    throw new NotFoundError();
  }

  const copies = await userGames.listOwn(userId, tx);
  const asked = await loans.listOpenForBorrower(userId, tx);
  const copyIds = new Set([
    ...copies.map((copy) => copy.id),
    ...asked.map((loan) => loan.userGameId),
  ]);
  for (const copyId of [...copyIds].sort()) {
    await userGames.lock(copyId, tx);
  }
  const theirs = await loans.listOpenForBorrower(userId, tx);
  const onTheirCopies = await loans.listOpenForCopies(
    copies.map((copy) => copy.id),
    tx,
  );
  if ([...theirs, ...onTheirCopies].some(isUnsettled)) {
    throw new ChangedError("loan-open");
  }
  for (const loan of theirs) {
    if (canMove(loan, "withdraw", "borrower")) {
      await loans.setStatus(loan.id, "withdrawn", tx);
    } else if (canMove(loan, "cancel", "borrower")) {
      await loans.setStatus(loan.id, "cancelled", tx);
    }
  }

  const today = todayIn(PLAN_TIME_ZONE, now);
  const nights = await gameNights.listVisibleFrom(
    userId,
    new Date(now.getTime() - DAY_AND_A_HALF_MS),
    tx,
  );
  for (const { id } of nights) {
    await gameNights.lock(id, tx);
    const night = await gameNights.getById(id, tx);
    if (
      !night ||
      night.cancelledAt !== null ||
      !isUpcoming(night.startsAt, today)
    ) {
      continue;
    }
    if (night.createdBy === userId) {
      await cancelAndTell(gameNights, notices, night, null, now, tx);
    } else if (await gameNights.getAttendee(night.id, userId, tx)) {
      await leaveTable(gameNights, userGames, night.id, userId, tx);
      await gameNights.removeAttendee(night.id, userId, tx);
      await fillSeats(gameNights, notices, night, tx);
    }
  }
  await gameNights.removePlacesOf(userId, tx);

  for (const copy of copies) {
    await userGames.remove(copy.id, tx);
  }
  for (const friendId of await repositories.friendships.listFriendIds(
    userId,
    tx,
  )) {
    await repositories.friendships.remove(userId, friendId, tx);
  }
  for (const request of await repositories.friendRequests.listInvolving(
    userId,
    tx,
  )) {
    await repositories.friendRequests.remove(request.id, tx);
  }
  await repositories.friendLinks.remove(userId, tx);
  await repositories.userSettings.remove(userId, tx);
  await notices.removeAllFor(userId, tx);
  await repositories.userProfiles.remove(userId, tx);
  await repositories.signIns.anonymize(userId, tx);
  return { name: profile.name, photoKey: profile.photoKey };
}

// The photo's file, once its account's rows are gone. A file left behind is logged, not refused:
// nothing points at it any more.
export async function removePhotoFile(
  fileStorage: IFileStorage,
  logger: ILoggerService,
  photoKey: string | null,
): Promise<void> {
  if (photoKey) {
    await fileStorage.remove("profile-photos", photoKey).catch((err) => {
      logger.warn("Couldn't remove the photo", loggable(err));
    });
  }
}
