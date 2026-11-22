import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import { type GameCard, gameCard } from "@/src/entities/game-card";
import { copyState } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { UserGame } from "@/src/entities/models/user-game.model";

export type IListMyLibraryUseCase = ReturnType<typeof listMyLibraryUseCase>;

export type MyLibrary = {
  // Every copy the member owns, by its game's title, each with its card (B6).
  copies: { copy: UserGame; game: Game; card: GameCard }[];
  // How many pass along: B6's "On for N of M copies".
  passingAlong: number;
  // The switch's own state: the default for copies added later, which it sets with every copy.
  defaultPassAlong: boolean;
};

// My library (B6). Each read waits for the one before (KTD2).
export const listMyLibraryUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  userProfilesRepository: IUserProfilesRepository,
  userSettingsRepository: IUserSettingsRepository,
) => {
  return async (userId: string, today: string): Promise<MyLibrary> => {
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

    const rows = copies.flatMap((copy) => {
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
      // A copy that's free reads "At home" (B6), where a game's card counts its free copies.
      return [
        {
          copy,
          game,
          card:
            state.kind === "available"
              ? { ...card, stateLine: "At home" }
              : card,
        },
      ];
    });
    rows.sort(
      (a, b) =>
        (a.game.searchTitle < b.game.searchTitle ? -1 : 0) ||
        (a.game.searchTitle > b.game.searchTitle ? 1 : 0),
    );
    return {
      copies: rows,
      passingAlong: copies.filter((copy) => copy.passAlong).length,
      defaultPassAlong: settings?.defaultPassAlong ?? false,
    };
  };
};
