import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import { type GameCard, gameCard } from "@/src/entities/game-card";
import {
  type LibraryItem,
  type LibraryList,
  type LibraryView,
  listLibrary,
} from "@/src/entities/library-filters";
import { copyState } from "@/src/entities/loan";
import type { GameSuggestion } from "@/src/entities/models/game-suggestion.model";
import type { UserGame } from "@/src/entities/models/user-game.model";

export type IListMyLibraryUseCase = ReturnType<typeof listMyLibraryUseCase>;

// My library (B6): every copy the member owns, each with its card, in the same list as All
// friends with its filters and sort (U8), then the Lending panel's numbers.
export type MyLibrary = LibraryList<
  LibraryItem & { copy: UserGame; card: GameCard }
> & {
  // How many pass along, of how many copies: B6's "On for N of M copies".
  passingAlong: number;
  copies: number;
  // The switch's own state: the default for copies added later, which it sets with every copy.
  defaultPassAlong: boolean;
  // Before any friends, A7 says so with your friend link.
  hasFriends: boolean;
  // Your suggestions still waiting on the admin (U9): "suggested today · waiting on the admin".
  suggestions: GameSuggestion[];
};

// Each read waits for the one before (KTD2).
export const listMyLibraryUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  userProfilesRepository: IUserProfilesRepository,
  userSettingsRepository: IUserSettingsRepository,
  friendshipsRepository: IFriendshipsRepository,
  gameSuggestionsRepository: IGameSuggestionsRepository,
) => {
  return async (
    userId: string,
    today: string,
    view: LibraryView,
  ): Promise<MyLibrary> => {
    const copies = await userGamesRepository.listOwn(userId);
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
          userId,
          ...new Set(loans.map((loan) => loan.borrowerUserId)),
        ])
      ).map((person) => [person.userId, person]),
    );
    const settings = await userSettingsRepository.getByUserId(userId);
    const friendIds = await friendshipsRepository.listFriendIds(userId);
    const suggestions = await gameSuggestionsRepository.listWaitingBy(userId);
    // Most borrowed is the one sort that needs the pick-ups, so only it reads them.
    const pickUps =
      view.sort === "most-borrowed"
        ? await loansRepository.countPickedUpForCopies(
            copies.map((copy) => copy.id),
          )
        : [];

    const items = copies.flatMap((copy) => {
      const game = games.get(copy.gameId);
      if (!game) {
        return [];
      }
      const state = copyState(
        copy,
        loans.filter((loan) => loan.userGameId === copy.id),
        userId,
        today,
      );
      const card = gameCard([{ copy, state }], people, userId);
      return [
        {
          game,
          copy,
          // A copy that's free reads "At home" (B6), where a game's card counts its free copies.
          card:
            state.kind === "available"
              ? { ...card, stateLine: "At home" }
              : card,
          ownerIds: [userId],
          availableNow: state.kind === "available",
          addedAt: copy.createdAt,
          borrowed:
            pickUps.find((row) => row.userGameId === copy.id)?.count ?? 0,
        },
      ];
    });

    return {
      ...listLibrary(items, view),
      passingAlong: copies.filter((copy) => copy.passAlong).length,
      copies: copies.length,
      defaultPassAlong: settings?.defaultPassAlong ?? false,
      hasFriends: friendIds.length > 0,
      suggestions,
    };
  };
};
