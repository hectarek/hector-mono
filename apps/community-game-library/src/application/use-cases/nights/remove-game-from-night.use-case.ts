import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { nightToBringTo } from "@/src/application/use-cases/nights/bring-games";
import { NotFoundError } from "@/src/entities/errors/common";

export type IRemoveGameFromNightUseCase = ReturnType<
  typeof removeGameFromNightUseCase
>;

// A game unticked on D6 when bringing games: its owner takes it off the table, with its votes.
export const removeGameFromNightUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  userGamesRepository: IUserGamesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "removeGameFromNight",
  });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    userGameId: string,
    userId: string,
  ): Promise<void> =>
    transactionManagerService.startTransaction(async (tx) => {
      const night = await nightToBringTo(readers, gameNightId, userId, tx);
      const copy = await userGamesRepository.getById(userGameId, tx);
      if (!copy || copy.userId !== userId) {
        throw new NotFoundError();
      }
      await gameNightsRepository.removeGames(night.id, [userGameId], tx);
      logger.debug("Taken off the table", { gameNightId: night.id });
    });
};
