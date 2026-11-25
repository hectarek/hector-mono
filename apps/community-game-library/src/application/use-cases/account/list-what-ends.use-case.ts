import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { copyState, isUnsettled } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { GameNight } from "@/src/entities/models/game-night.model";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import {
  formerMember,
  type NameAndPiece,
} from "@/src/entities/models/user-profile.model";
import { isUpcoming } from "@/src/entities/night";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IListWhatEndsUseCase = ReturnType<typeof listWhatEndsUseCase>;

// A loan to settle first (E8): its copy's game, and who has the game now.
export type LoanToSettle = {
  loan: Loan;
  copy: UserGame;
  game: Game;
  holder: NameAndPiece;
};

// What deleting a member's account ends (E8, R41): the loans they settle first, the games they
// have before the ones others have, each soonest due first, with Delete my account switched off
// while there are any; the nights they host that are coming up, soonest first, which are
// cancelled with everyone told; their own requests, then others' for their copies, each as a
// request before the places in line; and how many of their games leave their friends' libraries.
export type WhatEnds = {
  you: NameAndPiece;
  settleFirst: LoanToSettle[];
  nights: GameNight[];
  yourRequests: { loan: Loan; game: Game; inLine: boolean }[];
  requestsForYours: {
    loan: Loan;
    game: Game;
    by: NameAndPiece;
    inLine: boolean;
  }[];
  games: number;
};

// Requests before places in line, each in the order they were made.
const requestsFirst = (a: { inLine: boolean }, b: { inLine: boolean }) =>
  Number(a.inLine) - Number(b.inLine);

const DAY_AND_A_HALF_MS = 36 * 60 * 60 * 1000;

// Each read waits for the one before (KTD2).
export const listWhatEndsUseCase = (
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  gamesRepository: IGamesRepository,
  userProfilesRepository: IUserProfilesRepository,
  gameNightsRepository: IGameNightsRepository,
) => {
  return async (userId: string, now: Date): Promise<WhatEnds> => {
    const today = todayIn(PLAN_TIME_ZONE, now);
    const own = await userGamesRepository.listOwn(userId);
    const theirs = await loansRepository.listOpenForBorrower(userId);
    const borrowedCopies = await userGamesRepository.listByIds([
      ...new Set(theirs.map((loan) => loan.userGameId)),
    ]);
    const copies = new Map(
      [...own, ...borrowedCopies].map((copy) => [copy.id, copy]),
    );
    const open = await loansRepository.listOpenForCopies([...copies.keys()]);
    const onOwn = open.filter(
      (loan) => copies.get(loan.userGameId)?.userId === userId,
    );

    const settle = [...theirs, ...onOwn].filter(isUnsettled);
    const asked = theirs.filter((loan) => !isUnsettled(loan));
    const askedOfYou = onOwn.filter((loan) => !isUnsettled(loan));
    const games = new Map(
      (
        await gamesRepository.listByIds([
          ...new Set([...copies.values()].map((copy) => copy.gameId)),
        ])
      ).map((game) => [game.id, game]),
    );
    const stateOf = (copy: UserGame) =>
      copyState(
        copy,
        open.filter((loan) => loan.userGameId === copy.id),
        userId,
        today,
      );
    // A request waits in line while someone else has the copy or was said yes to.
    const inLine = (loan: Loan) =>
      open.some(
        (other) =>
          other.userGameId === loan.userGameId &&
          other.id !== loan.id &&
          (isUnsettled(other) || other.status === "accepted"),
      );
    // Who has the game: the borrower of the loan that holds it, or, for a yes being handed on to
    // the member, whoever is handing it on.
    const holderOf = (loan: Loan, copy: UserGame) =>
      loan.status === "accepted"
        ? (stateOf(copy).holder?.borrowerUserId ?? copy.userId)
        : loan.borrowerUserId;
    const people = new Map(
      (
        await userProfilesRepository.getManyByUserIds([
          ...new Set([
            userId,
            ...settle.flatMap((loan) => {
              const copy = copies.get(loan.userGameId);
              return copy ? [holderOf(loan, copy)] : [];
            }),
            ...askedOfYou.map((loan) => loan.borrowerUserId),
          ]),
        ])
      ).map((person) => [person.userId, person]),
    );
    const personOf = (id: string) => people.get(id) ?? formerMember(id);
    const withGame = <T extends Loan>(loan: T) => {
      const copy = copies.get(loan.userGameId);
      const game = copy && games.get(copy.gameId);
      return copy && game ? [{ loan, copy, game }] : [];
    };

    const nights = (
      await gameNightsRepository.listVisibleFrom(
        userId,
        new Date(now.getTime() - DAY_AND_A_HALF_MS),
      )
    ).filter(
      (night) =>
        night.createdBy === userId && isUpcoming(night.startsAt, today),
    );

    return {
      you: personOf(userId),
      settleFirst: settle
        .flatMap(withGame)
        .map(({ loan, copy, game }) => ({
          loan,
          copy,
          game,
          holder: personOf(holderOf(loan, copy)),
        }))
        .sort(
          (a, b) =>
            Number(b.loan.borrowerUserId === userId) -
              Number(a.loan.borrowerUserId === userId) ||
            (a.loan.dueOn ?? "9999").localeCompare(b.loan.dueOn ?? "9999") ||
            a.loan.createdAt.getTime() - b.loan.createdAt.getTime(),
        ),
      nights,
      yourRequests: asked
        .flatMap(withGame)
        .map(({ loan, game }) => ({ loan, game, inLine: inLine(loan) }))
        .sort(requestsFirst),
      requestsForYours: askedOfYou
        .flatMap(withGame)
        .map(({ loan, game }) => ({
          loan,
          game,
          by: personOf(loan.borrowerUserId),
          inLine: inLine(loan),
        }))
        .sort(requestsFirst),
      // Games, not copies: a second copy of a game counts once.
      games: new Set(own.map((copy) => copy.gameId)).size,
    };
  };
};
