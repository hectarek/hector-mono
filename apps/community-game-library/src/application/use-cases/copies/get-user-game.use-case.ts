import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { requireOwnCopy } from "@/src/application/use-cases/copies/require-own-copy";
import { NotFoundError } from "@/src/entities/errors/common";
import { type CopyState, copyState } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IGetUserGameUseCase = ReturnType<typeof getUserGameUseCase>;

export type CopyView = {
  copy: UserGame;
  game: Game;
  // The game's expansions, any of which can be ticked in the box, and the ids of those that are.
  expansions: Game[];
  boxed: string[];
  state: CopyState<Loan>;
  // Its loans that were picked up, newest first (B7's history; none until Batch 4 lends).
  history: Loan[];
  // Everyone its loans name, by name and piece.
  people: Record<string, NameAndPiece>;
};

// One of my copies (B7), for its owner only. Each read waits for the one before (KTD2).
export const getUserGameUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (
    userGameId: string,
    userId: string,
    today: string,
  ): Promise<CopyView> => {
    const copy = await requireOwnCopy(userGamesRepository, userGameId, userId);
    const game = await gamesRepository.getById(copy.gameId);
    if (!game) {
      throw new NotFoundError();
    }
    const expansions = await gamesRepository.listExpansions(game.id);
    const boxed = await userGamesRepository.listExpansionsInBoxes([copy.id]);
    const open = await loansRepository.listOpenForCopies([copy.id]);
    const history = await loansRepository.listHistoryForCopy(copy.id);
    const people = await userProfilesRepository.getManyByUserIds([
      ...new Set([...open, ...history].map((loan) => loan.borrowerUserId)),
    ]);
    return {
      copy,
      game,
      expansions,
      boxed: boxed.map((row) => row.gameId),
      state: copyState(copy, open, userId, today),
      history,
      people: Object.fromEntries(
        people.map((person) => [person.userId, person]),
      ),
    };
  };
};
