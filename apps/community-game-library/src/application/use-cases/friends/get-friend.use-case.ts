import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import { requireFriend } from "@/src/application/use-cases/friends/require-friend";
import { NotFoundError } from "@/src/entities/errors/common";
import { type GameCard, gameCard } from "@/src/entities/game-card";
import {
  type LibraryItem,
  type LibraryList,
  type LibraryView,
  listLibrary,
} from "@/src/entities/library-filters";
import {
  copyState,
  HOLDING_STATUSES,
  type LoanStatus,
} from "@/src/entities/loan";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { UserProfile } from "@/src/entities/models/user-profile.model";
import { PHOTO_URL_SECONDS } from "@/src/entities/profile-photo";

export type IGetFriendUseCase = ReturnType<typeof getFriendUseCase>;

// A loan between the two, named for E4's lines: "Moss & Mortar stays on your Loans until it's
// back with Sam".
export type LoanBetween = {
  title: string;
  // Whose copy it is: yours, or your friend's.
  yours: boolean;
};

export type FriendPage = {
  profile: UserProfile;
  // The photo's signed address, for an hour, or null with no photo.
  photoUrl: string | null;
  since: Date;
  library: LibraryList<LibraryItem & { copy: UserGame; card: GameCard }>;
  // What unfriending would do (E4, R50): loans that stay open until the game is back, requests
  // and places in line that are withdrawn, and yeses not picked up yet that are cancelled.
  between: {
    staying: LoanBetween[];
    withdrawn: LoanBetween[];
    cancelled: LoanBetween[];
  };
};

const holding: readonly LoanStatus[] = HOLDING_STATUSES;

// A friend's page (E3): their photo, piece, name, phone, when you became friends, and their
// library in the Library's one list, each copy as you see it (U8). A member who isn't their
// friend gets Not found (AE8), as does the member's own id. Each read waits for the one before
// (KTD2).
export const getFriendUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  userProfilesRepository: IUserProfilesRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  loansRepository: ILoansRepository,
  fileStorage: IFileStorage,
) => {
  return async (
    friendId: string,
    viewerId: string,
    today: string,
    view: LibraryView,
  ): Promise<FriendPage> => {
    if (friendId === viewerId) {
      throw new NotFoundError();
    }
    await requireFriend(friendshipsRepository, viewerId, friendId);
    const profile = await userProfilesRepository.getByUserId(friendId);
    const since = await friendshipsRepository.getSince(viewerId, friendId);
    if (!profile || !since) {
      throw new NotFoundError();
    }
    const photoUrl = profile.photoKey
      ? await fileStorage.signedUrl(
          "profile-photos",
          profile.photoKey,
          PHOTO_URL_SECONDS,
        )
      : null;

    const theirs = await userGamesRepository.listOwn(friendId);
    const yours = await userGamesRepository.listOwn(viewerId);
    const copies = [...theirs, ...yours];
    const games = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set(copies.map((copy) => copy.gameId)),
        ])
      ).map((game) => [game.id, game]),
    );
    const loans = await loansRepository.listOpenForCopies(
      copies.map((copy) => copy.id),
    );
    const people = Object.fromEntries(
      (
        await userProfilesRepository.getManyByUserIds([
          viewerId,
          friendId,
          ...new Set(loans.map((loan) => loan.borrowerUserId)),
        ])
      ).map((person) => [person.userId, person]),
    );
    const pickUps =
      view.sort === "most-borrowed"
        ? await loansRepository.countPickedUpForCopies(
            theirs.map((copy) => copy.id),
          )
        : [];

    const items = theirs.flatMap((copy) => {
      const game = games.get(copy.gameId);
      if (!game) {
        return [];
      }
      const state = copyState(
        copy,
        loans.filter((loan) => loan.userGameId === copy.id),
        viewerId,
        today,
      );
      const card = gameCard([{ copy, state }], people, viewerId);
      return [
        {
          game,
          copy,
          // A copy you can ask for now reads "At Sam's" (E3), where a game's card counts its
          // free copies.
          card:
            card.stamp.word === "Available"
              ? { ...card, stateLine: `At ${profile.name}’s` }
              : card,
          ownerIds: [friendId],
          availableNow: state.kind === "available",
          addedAt: copy.createdAt,
          borrowed:
            pickUps.find((row) => row.userGameId === copy.id)?.count ?? 0,
        },
      ];
    });

    // The loans between the two: on their copies to you, and on yours to them.
    const between = (status: (loan: Loan) => boolean): LoanBetween[] =>
      loans.flatMap((loan) => {
        const copy = copies.find((one) => one.id === loan.userGameId);
        const title = copy && games.get(copy.gameId)?.title;
        const mine = copy?.userId === viewerId;
        const borrower = mine ? friendId : viewerId;
        return title && loan.borrowerUserId === borrower && status(loan)
          ? [{ title, yours: mine }]
          : [];
      });

    return {
      profile,
      photoUrl,
      since,
      library: listLibrary(items, view),
      between: {
        staying: between((loan) => holding.includes(loan.status)),
        withdrawn: between((loan) => loan.status === "requested"),
        cancelled: between((loan) => loan.status === "accepted"),
      },
    };
  };
};
