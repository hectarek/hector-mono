import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { copyState, isOverdue } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IListLoansUseCase = ReturnType<typeof listLoansUseCase>;

// A loan in one of Loans' lists: its copy's game, the other person, and who's first in the copy's
// line ("Jo is 1st in line").
export type LoanItem = {
  loan: Loan;
  copy: UserGame;
  game: Game;
  other: NameAndPiece;
  next: NameAndPiece | null;
};

// Loans (C4, R22), as far as U15 builds it: Needs you, the requests for the member's copies that
// are theirs to answer, the returns they confirm and the requests for more time; what they
// borrowed and what they lent, overdue first, with a yes waiting for its pick-up or a copy being
// handed to them; the lines they're in, with their place and the loan ahead (In line); and their
// requests waiting on an owner (You asked).
export type LoansList = {
  // The member, whose piece stands on what they borrowed.
  you: NameAndPiece | null;
  needsYou: (LoanItem & { why: "request" | "return" | "more-time" })[];
  borrowed: LoanItem[];
  lent: LoanItem[];
  inLine: (LoanItem & { place: number; holder: Loan | null })[];
  youAsked: LoanItem[];
};

type Row = { loan: Loan; copy: UserGame; other: string; next: string | null };

// Overdue first, then the soonest due, then a yes waiting for its pick-up, oldest first.
const byDue = (today: string) => (a: LoanItem, b: LoanItem) =>
  Number(isOverdue(b.loan, today)) - Number(isOverdue(a.loan, today)) ||
  (a.loan.dueOn ?? "9999").localeCompare(b.loan.dueOn ?? "9999") ||
  a.loan.createdAt.getTime() - b.loan.createdAt.getTime();

const bySince = (a: LoanItem, b: LoanItem) =>
  a.loan.updatedAt.getTime() - b.loan.updatedAt.getTime() ||
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
    const mine = await loansRepository.listOpenForBorrower(userId);
    const theirCopies: UserGame[] = [];
    for (const copyId of new Set(mine.map((loan) => loan.userGameId))) {
      const copy = await userGamesRepository.getById(copyId);
      if (copy) {
        theirCopies.push(copy);
      }
    }
    const loans = await loansRepository.listOpenForCopies(
      [...ownCopies, ...theirCopies].map((copy) => copy.id),
    );
    const stateOf = (copy: UserGame) =>
      copyState(
        copy,
        loans.filter((loan) => loan.userGameId === copy.id),
        userId,
        today,
      );

    const toAnswer: Row[] = [];
    const toConfirm: Row[] = [];
    const moreTime: Row[] = [];
    const lent: Row[] = [];
    for (const copy of ownCopies) {
      const state = stateOf(copy);
      const [first] = state.line;
      const next = first?.borrowerUserId ?? null;
      if (state.kind === "requested" && first) {
        toAnswer.push({ loan: first, copy, other: first.borrowerUserId, next });
      }
      const holder = state.holder ?? state.promised;
      if (holder?.status === "returning") {
        toConfirm.push({
          loan: holder,
          copy,
          other: holder.borrowerUserId,
          next,
        });
      } else if (holder?.moreTimeAskedAt) {
        moreTime.push({
          loan: holder,
          copy,
          other: holder.borrowerUserId,
          next,
        });
      } else if (holder) {
        lent.push({ loan: holder, copy, other: holder.borrowerUserId, next });
      }
    }
    const borrowed: Row[] = [];
    const inLine: (Row & { place: number; holder: Loan | null })[] = [];
    const waiting: Row[] = [];
    for (const copy of theirCopies) {
      const state = stateOf(copy);
      const loan = mine.find((one) => one.userGameId === copy.id);
      if (!loan) {
        continue;
      }
      const next =
        state.line.find((one) => one.borrowerUserId !== userId)
          ?.borrowerUserId ?? null;
      if (state.kind === "you-asked") {
        waiting.push({ loan, copy, other: copy.userId, next });
      } else if (state.kind === "in-line") {
        inLine.push({
          loan,
          copy,
          other: copy.userId,
          next: null,
          place: state.line.findIndex((one) => one.id === loan.id) + 1,
          holder: state.holder ?? state.promised,
        });
      } else if (
        state.kind === "you-have-it" ||
        state.kind === "to-pick-up" ||
        state.kind === "handed-to-you"
      ) {
        borrowed.push({ loan, copy, other: copy.userId, next });
      }
    }

    const rows = [
      ...toAnswer,
      ...toConfirm,
      ...moreTime,
      ...lent,
      ...borrowed,
      ...inLine,
      ...waiting,
    ];
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
          ...new Set([
            userId,
            ...rows.flatMap((row) =>
              row.next ? [row.other, row.next] : [row.other],
            ),
          ]),
        ])
      ).map((person) => [person.userId, person]),
    );
    const items = (list: Row[]): LoanItem[] =>
      list.flatMap(({ loan, copy, other, next }) => {
        const game = games.get(copy.gameId);
        const person = people.get(other);
        return game && person
          ? [
              {
                loan,
                copy,
                game,
                other: person,
                next: (next && people.get(next)) || null,
              },
            ]
          : [];
      });
    const asked = (a: LoanItem, b: LoanItem) =>
      a.loan.createdAt.getTime() - b.loan.createdAt.getTime() ||
      (a.loan.id < b.loan.id ? -1 : 1);

    return {
      you: people.get(userId) ?? null,
      needsYou: [
        ...items(moreTime)
          .sort(byDue(today))
          .map((item) => ({ ...item, why: "more-time" as const })),
        ...items(toConfirm)
          .sort(bySince)
          .map((item) => ({ ...item, why: "return" as const })),
        ...items(toAnswer)
          .sort(asked)
          .map((item) => ({ ...item, why: "request" as const })),
      ],
      borrowed: items(borrowed).sort(byDue(today)),
      lent: items(lent).sort(byDue(today)),
      inLine: inLine
        .flatMap((row) =>
          items([row]).map((item) => ({
            ...item,
            place: row.place,
            holder: row.holder,
          })),
        )
        .sort(asked),
      youAsked: items(waiting).sort(asked),
    };
  };
};
