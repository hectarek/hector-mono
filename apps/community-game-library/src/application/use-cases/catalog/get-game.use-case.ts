import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import { type CopyState, copyState } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { Loan } from "@/src/entities/models/loan.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";

export type IGetGameUseCase = ReturnType<typeof getGameUseCase>;

// One copy on a game's page (B5, B13): the copy, its state for the person looking, and the
// titles of the expansions in its box.
export type GameCopy = {
  copy: UserGame;
  state: CopyState<Loan>;
  boxedExpansions: string[];
};

export type GameView = {
  game: Game;
  // An expansion's base game, or null for a base game.
  baseGame: Game | null;
  // A base game's expansions, by title; none for an expansion.
  expansions: Game[];
  // The copies the person looking may see that hold this game: their friends', in the order
  // they were added, then their own (B13). An expansion is held in a box, so its copies are its
  // base game's that hold it.
  copies: GameCopy[];
  // Everyone the copies' lines name, by user id: the owners, the holders and the people in line.
  // Names and pieces only, since the person holding a friend's copy needn't be a friend (KTD4).
  people: Record<string, NameAndPiece>;
};

// A game's page (R14, B5, B11, B13). Each read waits for the one before (KTD2).
export const getGameUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  userProfilesRepository: IUserProfilesRepository,
) => {
  return async (
    gameId: string,
    viewerId: string,
    today: string,
  ): Promise<GameView> => {
    const game = await gamesRepository.getById(gameId);
    if (!game) {
      throw new NotFoundError();
    }
    const baseGame =
      game.baseGameId === null
        ? null
        : ((await gamesRepository.getById(game.baseGameId)) ?? null);
    // The expansions a box can hold: the game's own, or its base game's.
    const boxable = await gamesRepository.listExpansions(
      baseGame?.id ?? game.id,
    );
    const shelved = await userGamesRepository.listVisibleForGame(
      baseGame?.id ?? game.id,
      viewerId,
    );
    const boxes = await userGamesRepository.listExpansionsInBoxes(
      shelved.map((copy) => copy.id),
    );
    const holding =
      baseGame === null
        ? shelved
        : shelved.filter((copy) =>
            boxes.some(
              (boxed) =>
                boxed.userGameId === copy.id && boxed.gameId === game.id,
            ),
          );
    const loans = await loansRepository.listOpenForCopies(
      holding.map((copy) => copy.id),
    );
    const people = await userProfilesRepository.getManyByUserIds([
      ...new Set([
        ...holding.map((copy) => copy.userId),
        ...loans.map((loan) => loan.borrowerUserId),
      ]),
    ]);

    const titles = new Map(
      boxable.map((expansion) => [expansion.id, expansion.title]),
    );
    const inOrder = [
      ...holding.filter((copy) => copy.userId !== viewerId),
      ...holding.filter((copy) => copy.userId === viewerId),
    ];
    return {
      game,
      baseGame,
      expansions: baseGame === null ? boxable : [],
      copies: inOrder.map((copy) => ({
        copy,
        state: copyState(
          copy,
          loans.filter((loan) => loan.userGameId === copy.id),
          viewerId,
          today,
        ),
        boxedExpansions: boxes
          .filter((boxed) => boxed.userGameId === copy.id)
          .flatMap((boxed) => titles.get(boxed.gameId) ?? []),
      })),
      people: Object.fromEntries(
        people.map((person) => [person.userId, person]),
      ),
    };
  };
};
