import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IGameNightsRepository } from "@/src/application/repositories/game-nights.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { nightToChange } from "@/src/application/use-cases/nights/can-see-night";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { newLinkToken } from "@/src/entities/link-token";

export type IMakeNightLinkUseCase = ReturnType<typeof makeNightLinkUseCase>;

// Make a new link (D7, R30's audit line), after its dialog: the night gets a new code, and the
// link already shared stops working. Only the host makes one. Answers the new code.
export const makeNightLinkUseCase = (
  friendshipsRepository: IFriendshipsRepository,
  gameNightsRepository: IGameNightsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "makeNightLink",
  });
  const readers = {
    friendships: friendshipsRepository,
    gameNights: gameNightsRepository,
  };

  return async (gameNightId: string, userId: string): Promise<string> =>
    transactionManagerService.startTransaction(async (tx) => {
      await gameNightsRepository.lock(gameNightId, tx);
      const night = await nightToChange(readers, gameNightId, userId, tx);
      if (night.createdBy !== userId) {
        throw new UnauthorizedError("Only the host makes a night’s link.");
      }
      const linkToken = newLinkToken();
      await gameNightsRepository.update(night.id, { linkToken }, tx);
      logger.debug("New link", { gameNightId: night.id });
      return linkToken;
    });
};
