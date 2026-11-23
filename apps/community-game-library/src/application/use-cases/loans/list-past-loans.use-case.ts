import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { daysLate } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IListPastLoansUseCase = ReturnType<typeof listPastLoansUseCase>;

// A loan on Past loans (C12): its game, the other person, and how many days late it came back.
export type PastLoan = {
  loan: Loan;
  game: Game;
  other: NameAndPiece;
  daysLate: number;
};

export type PastLoans = { borrowed: PastLoan[]; lent: PastLoan[] };

// Past loans (C12, R23): what the member borrowed and what they lent that ended after its pick-up,
// given back or handed on, newest return first. A loan whose other person has left goes
// unlisted, as a removed member's name goes everywhere. Each read waits for the one before (KTD2).
export const listPastLoansUseCase = (
  loansRepository: ILoansRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string): Promise<PastLoans> => {
    const borrowed = await loansRepository.listEndedForBorrower(userId);
    const ownCopies = await userGamesRepository.listOwn(userId);
    const lent = await loansRepository.listEndedForCopies(
      ownCopies.map((copy) => copy.id),
    );
    const copies = new Map<string, UserGame>(
      ownCopies.map((copy) => [copy.id, copy]),
    );
    for (const copyId of new Set(borrowed.map((loan) => loan.userGameId))) {
      const copy = await userGamesRepository.getById(copyId);
      if (copy) {
        copies.set(copy.id, copy);
      }
    }
    const games = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set([...copies.values()].map((copy) => copy.gameId)),
        ])
      ).map((game) => [game.id, game]),
    );
    const ownerOf = (loan: Loan) => copies.get(loan.userGameId)?.userId;
    const people = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set([
            ...borrowed.flatMap((loan) => ownerOf(loan) ?? []),
            ...lent.map((loan) => loan.borrowerUserId),
          ]),
        ])
      ).map((person) => [person.userId, person]),
    );
    const item = (loan: Loan, otherId: string | undefined): PastLoan[] => {
      const copy = copies.get(loan.userGameId);
      const game = copy && games.get(copy.gameId);
      const other = otherId && people.get(otherId);
      return game && other
        ? [{ loan, game, other, daysLate: daysLate(loan) }]
        : [];
    };
    return {
      borrowed: borrowed.flatMap((loan) => item(loan, ownerOf(loan))),
      lent: lent.flatMap((loan) => item(loan, loan.borrowerUserId)),
    };
  };
};
