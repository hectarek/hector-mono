import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { nightToBringTo } from "@/src/application/use-cases/nights/bring-games";
import { NotFoundError } from "@/src/entities/errors/common";

export type IVoteUseCase = ReturnType<typeof voteUseCase>;

// I'd play (R38; D7, D13): the host or someone going says they'd play a game on the table, or
// takes it back. A game that's not on the table is Not found.
export const voteUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "vote" });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (
    gameNightId: string,
    { userGameId, play }: { userGameId: string; play: boolean },
    userId: string,
  ): Promise<void> =>
    transactionManagerService.startTransaction(async (tx) => {
      const night = await nightToBringTo(readers, gameNightId, userId, tx);
      const onTable = await gameNightsRepository.listGames([night.id], tx);
      if (!onTable.some((one) => one.userGameId === userGameId)) {
        throw new NotFoundError();
      }
      const vote = { gameNightId: night.id, userGameId, userId };
      if (play) {
        await gameNightsRepository.addVote(vote, tx);
      } else {
        await gameNightsRepository.removeVote(vote, tx);
      }
      logger.debug("Voted", { gameNightId: night.id, play });
    });
};
