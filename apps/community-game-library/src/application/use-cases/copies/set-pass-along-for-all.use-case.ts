import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";

export type ISetPassAlongForAllUseCase = ReturnType<
  typeof setPassAlongForAllUseCase
>;

// My library's "Friends can pass my games along" (B6, R48): every copy the member owns, and their
// default for copies added later, together.
export const setPassAlongForAllUseCase = (
  userGamesRepository: IUserGamesRepository,
  userSettingsRepository: IUserSettingsRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "setPassAlongForAll",
  });

  return async (passAlong: boolean, userId: string): Promise<void> =>
    transactionManagerService.startTransaction(async (tx) => {
      await userGamesRepository.setPassAlongForAll(userId, passAlong, tx);
      await userSettingsRepository.update(
        userId,
        { defaultPassAlong: passAlong },
        tx,
      );
      logger.debug("Pass-along set for every copy", { passAlong });
    });
};
