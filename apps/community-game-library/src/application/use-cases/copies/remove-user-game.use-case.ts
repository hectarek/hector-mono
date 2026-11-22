import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { ILoansRepository } from "@/src/application/repositories/loans.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireOwnCopy } from "@/src/application/use-cases/copies/require-own-copy";
import { UnauthorizedError } from "@/src/entities/errors/common";

export type IRemoveUserGameUseCase = ReturnType<typeof removeUserGameUseCase>;

// Remove a copy (B14), and I own it's Undo: refused while someone has it (AE2), and otherwise
// gone with its box, its loans and their notices (data-model.md, What goes with a copy). Gives
// back the game's title for the message.
export const removeUserGameUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  loansRepository: ILoansRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "removeUserGame",
  });

  return async (
    userGameId: string,
    userId: string,
  ): Promise<{ title: string }> =>
    transactionManagerService.startTransaction(async (tx) => {
      const copy = await requireOwnCopy(
        userGamesRepository,
        userGameId,
        userId,
        tx,
      );
      if (await loansRepository.getCurrentForCopy(userGameId, tx)) {
        throw new UnauthorizedError("You can remove it once it’s back.");
      }
      const game = await gamesRepository.getById(copy.gameId, tx);
      await userGamesRepository.remove(userGameId, tx);
      logger.debug("Copy removed", { userGameId });
      return { title: game?.title ?? "" };
    });
};
