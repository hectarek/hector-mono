import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { copyState } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IListLoansUseCase = ReturnType<typeof listLoansUseCase>;

// A loan in one of Loans' lists: its copy's game, and the other person.
export type LoanItem = {
  loan: Loan;
  copy: UserGame;
  game: Game;
  other: NameAndPiece;
};

// Loans (C4), as far as U12 builds it: requests for the member's copies that are theirs to answer
// (Needs you), and their own requests waiting on an owner (You asked), each oldest first. The
// loans out, the lines and more time join with U13 to U15.
export type LoansList = {
  needsYou: LoanItem[];
  youAsked: LoanItem[];
};

const byAsked = (a: LoanItem, b: LoanItem) =>
  a.loan.createdAt.getTime() - b.loan.createdAt.getTime() ||
  (a.loan.id < b.loan.id ? -1 : 1);

// Each read waits for the one before (KTD2).
export const listLoansUseCase = (
  loansRepository: ILoansRepository,
  userGamesRepository: IUserGamesRepository,
  gamesRepository: IGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (userId: string, today: string): Promise<LoansList> => {
    const ownCopies = await userGamesRepository.listOwn(userId);
    const asked = (await loansRepository.listOpenForBorrower(userId)).filter(
      (loan) => loan.status === "requested",
    );
    const theirCopies: UserGame[] = [];
    for (const copyId of new Set(asked.map((loan) => loan.userGameId))) {
      const copy = await userGamesRepository.getById(copyId);
      if (copy) {
        theirCopies.push(copy);
      }
    }
    const copies = [...ownCopies, ...theirCopies];
    const loans = await loansRepository.listOpenForCopies(
      copies.map((copy) => copy.id),
    );

    const stateOf = (copy: UserGame) =>
      copyState(
        copy,
        loans.filter((loan) => loan.userGameId === copy.id),
        userId,
        today,
      );
    const toAnswer = ownCopies.flatMap((copy) => {
      const state = stateOf(copy);
      const first = state.line[0];
      return state.kind === "requested" && first
        ? [{ loan: first, copy, other: first.borrowerUserId }]
        : [];
    });
    const waiting = theirCopies.flatMap((copy) => {
      const state = stateOf(copy);
      const mine = state.line.find((loan) => loan.borrowerUserId === userId);
      return state.kind === "you-asked" && mine
        ? [{ loan: mine, copy, other: copy.userId }]
        : [];
    });

    const rows = [...toAnswer, ...waiting];
    const games = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set(rows.map((row) => row.copy.gameId)),
        ])
      ).map((game) => [game.id, game]),
    );
    const people = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set(rows.map((row) => row.other)),
        ])
      ).map((person) => [person.userId, person]),
    );
    const items = (list: typeof rows): LoanItem[] =>
      list
        .flatMap(({ loan, copy, other }) => {
          const game = games.get(copy.gameId);
          const person = people.get(other);
          return game && person ? [{ loan, copy, game, other: person }] : [];
        })
        .sort(byAsked);
    return { needsYou: items(toAnswer), youAsked: items(waiting) };
  };
};
