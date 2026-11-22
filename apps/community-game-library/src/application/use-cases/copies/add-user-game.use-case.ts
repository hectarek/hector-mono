import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { Game } from "@/src/entities/models/game.model";
import type { UserGame } from "@/src/entities/models/user-game.model";

export type IAddUserGameUseCase = ReturnType<typeof addUserGameUseCase>;

// I own it (R8, B8, B10): a new copy of a game on the member's shelf, passing along as their
// default says (R48). A second copy is the same again (R9). An expansion is never a copy of its
// own (R3): it goes in the box of the member's copy of its base game (put-in-box).
export const addUserGameUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  userSettingsRepository: IUserSettingsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addUserGame" });

  return async (
    gameId: string,
    userId: string,
  ): Promise<{ copy: UserGame; game: Game }> =>
    transactionManagerService.startTransaction(async (tx) => {
      const game = await gamesRepository.getById(gameId, tx);
      if (!game) {
        throw new NotFoundError();
      }
      if (game.type === "expansion") {
        throw new InputParseError(
          "An expansion goes in the box of your copy of its base game",
        );
      }
      const settings = await userSettingsRepository.getByUserId(userId, tx);
      const copy = await userGamesRepository.add(
        { userId, gameId, passAlong: settings?.defaultPassAlong ?? false },
        tx,
      );
      logger.debug("Copy added", { userGameId: copy.id, gameId });
      return { copy, game };
    });
};
