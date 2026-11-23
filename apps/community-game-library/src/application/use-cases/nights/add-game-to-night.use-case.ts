import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { nightToBringTo } from "@/src/application/use-cases/nights/bring-games";
import { NotFoundError } from "@/src/entities/errors/common";

export type IAddGameToNightUseCase = ReturnType<typeof addGameToNightUseCase>;

// I'll bring a game (D7, D13, R32): the member's own copies go on the table, picked through D6.
// Only the host and people going bring games; anyone else's copy is Not found to them.
export const addGameToNightUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  userGamesRepository: IUserGamesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "addGameToNight",
  });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    userGameIds: readonly string[],
    userId: string,
  ): Promise<void> =>
    transactionManagerService.startTransaction(async (tx) => {
      const night = await nightToBringTo(readers, gameNightId, userId, tx);
      const picked = [...new Set(userGameIds)];
      const copies = await userGamesRepository.listByIds(picked, tx);
      if (
        copies.length !== picked.length ||
        copies.some((copy) => copy.userId !== userId)
      ) {
        throw new NotFoundError();
      }
      await gameNightsRepository.addGames(night.id, picked, tx);
      logger.debug("Brought", { gameNightId: night.id, games: picked.length });
    });
};
