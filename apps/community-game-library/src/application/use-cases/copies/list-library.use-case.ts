import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { type GameCard, gameCard } from "@/src/entities/game-card";
import {
  type LibraryItem,
  type LibraryList,
  type LibraryView,
  listLibrary,
} from "@/src/entities/library-filters";
import { copyState } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IListLibraryUseCase = ReturnType<typeof listLibraryUseCase>;

// All friends (B1): every game on your shelf and your friends' shelves, one card each (R11),
// filtered and sorted as the address says (R12, R13). Only your own and your friends' copies
// load (KTD4), so a stranger's games never show (AE8).
export type Library = LibraryList<LibraryItem & { card: GameCard }> & {
  // The owners the owner filter offers, you first, then your friends by name.
  owners: NameAndPiece[];
  // Before any friends, the list says so with your friend link, and once you have some, whether
  // they've added games yet (screens.md, Empty lists).
  hasFriends: boolean;
  friendsOwnGames: boolean;
};

// Each read waits for the one before (KTD2).
export const listLibraryUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  userProfilesRepository: IUserProfilesRepository,
  friendshipsRepository: IFriendshipsRepository,
) => {
  return async (
    viewerId: string,
    today: string,
    view: LibraryView,
  ): Promise<Library> => {
    const friendIds = await friendshipsRepository.listFriendIds(viewerId);
    const copies = await userGamesRepository.listVisible(viewerId);
    const games = await gamesRepository.listByIds([
      ...new Set(copies.map((copy) => copy.gameId)),
    ]);
    const loans = await loansRepository.listOpenForCopies(
      copies.map((copy) => copy.id),
    );
    const people = Object.fromEntries(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set([
            ...copies.map((copy) => copy.userId),
            ...loans.map((loan) => loan.borrowerUserId),
          ]),
        ])
      ).map((person) => [person.userId, person]),
    );
    // Most borrowed is the one sort that needs the pick-ups, so only it reads them.
    const pickUps =
      view.sort === "most-borrowed"
        ? await loansRepository.countPickedUpForCopies(
            copies.map((copy) => copy.id),
          )
        : [];

    const items = games.map((game) => {
      const own = copies.filter((copy) => copy.gameId === game.id);
      const states = own.map((copy) => ({
        copy,
        state: copyState(
          copy,
          loans.filter((loan) => loan.userGameId === copy.id),
          viewerId,
          today,
        ),
      }));
      return {
        game,
        card: gameCard(states, people, viewerId),
        ownerIds: [...new Set(own.map((copy) => copy.userId))],
        availableNow: states.some(
          ({ copy, state }) =>
            copy.lendable && state.holder === null && state.promised === null,
        ),
        addedAt: new Date(
          Math.max(...own.map((copy) => copy.createdAt.getTime())),
        ),
        borrowed: pickUps
          .filter((row) => own.some((copy) => copy.id === row.userGameId))
          .reduce((sum, row) => sum + row.count, 0),
      };
    });

    const owners = [...new Set(copies.map((copy) => copy.userId))].flatMap(
      (id) => people[id] ?? [],
    );
    owners.sort(
      (a, b) =>
        Number(b.userId === viewerId) - Number(a.userId === viewerId) ||
        a.name.localeCompare(b.name),
    );

    return {
      ...listLibrary(items, view),
      owners,
      hasFriends: friendIds.length > 0,
      friendsOwnGames: copies.some((copy) => copy.userId !== viewerId),
    };
  };
};
