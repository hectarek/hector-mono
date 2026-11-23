import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { HOLDING_STATUSES, type LoanStatus } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IGetNightGameChoicesUseCase = ReturnType<
  typeof getNightGameChoicesUseCase
>;

// A copy of the member's that can go on a night's table (D6), with who has it now, if anyone.
export type NightGameChoice = {
  userGameId: string;
  game: Game;
  lendable: boolean;
  holder: NameAndPiece | null;
};

const holdingStatuses: readonly LoanStatus[] = HOLDING_STATUSES;

// How likely each is to come: at home and lent first, then at home and kept, then out now.
const rank = (choice: NightGameChoice) =>
  choice.holder ? 2 : choice.lendable ? 0 : 1;

// Pick from your library (D6, R29, R32): every copy of the member's own, a game they keep from
// friends too ("Not lent to friends. Fine for your own night."), and one that's out now with who
// has it ("Out with Jo now"), by title within each.
export const getNightGameChoicesUseCase = (
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  loansRepository: ILoansRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string): Promise<NightGameChoice[]> => {
    const copies = await userGamesRepository.listOwn(userId);
    const games = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set(copies.map((copy) => copy.gameId)),
        ])
      ).map((game) => [game.id, game]),
    );
    const holding = (
      await loansRepository.listOpenForCopies(copies.map((copy) => copy.id))
    ).filter((loan) => holdingStatuses.includes(loan.status));
    const holders = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set(holding.map((loan) => loan.borrowerUserId)),
        ])
      ).map((person) => [person.userId, person]),
    );
    return copies
      .flatMap((copy): NightGameChoice[] => {
        const game = games.get(copy.gameId);
        if (!game) {
          return [];
        }
        const loan = holding.find((one) => one.userGameId === copy.id);
        return [
          {
            userGameId: copy.id,
            game,
            lendable: copy.lendable,
            holder: loan ? (holders.get(loan.borrowerUserId) ?? null) : null,
          },
        ];
      })
      .sort(
        (a, b) =>
          rank(a) - rank(b) ||
          (a.game.title < b.game.title
            ? -1
            : a.game.title > b.game.title
              ? 1
              : 0),
      );
  };
};
