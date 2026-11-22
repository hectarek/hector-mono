import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireOwnCopy } from "@/src/application/use-cases/copies/require-own-copy";
import type { UserGame } from "@/src/entities/models/user-game.model";

export type ISetLendingUseCase = ReturnType<typeof setLendingUseCase>;

// B7's two lending switches, each saved as it flips (screens.md rule 4): whether the copy is lent
// at all, and whether a borrower may pass it along to the next in line (R48).
export const setLendingUseCase = (
  userGamesRepository: IUserGamesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "setLending" });

  return async (
    userGameId: string,
    lending: { lendable?: boolean; passAlong?: boolean },
    userId: string,
  ): Promise<UserGame> =>
    transactionManagerService.startTransaction(async (tx) => {
      await requireOwnCopy(userGamesRepository, userGameId, userId, tx);
      const updated = await userGamesRepository.update(userGameId, lending, tx);
      logger.debug("Lending set", { userGameId });
      return updated;
    });
};
