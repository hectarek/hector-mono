import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireOwnCopy } from "@/src/application/use-cases/copies/require-own-copy";
import { InputParseError } from "@/src/entities/errors/common";
import type { CopyForm, UserGame } from "@/src/entities/models/user-game.model";

export type IUpdateUserGameUseCase = ReturnType<typeof updateUserGameUseCase>;

// B7's This copy, with Save: its condition, what's missing, and the expansions in its box, all at
// once. Only the copy's game's own expansions can be ticked (R3).
export const updateUserGameUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "updateUserGame",
  });

  return async (
    userGameId: string,
    form: CopyForm,
    userId: string,
  ): Promise<UserGame> =>
    transactionManagerService.startTransaction(async (tx) => {
      const copy = await requireOwnCopy(
        userGamesRepository,
        userGameId,
        userId,
        tx,
      );
      const its = new Set(
        (await gamesRepository.listExpansions(copy.gameId, tx)).map(
          (expansion) => expansion.id,
        ),
      );
      if (form.expansionIds.some((id) => !its.has(id))) {
        throw new InputParseError("Only this game's expansions go in its box");
      }
      const updated = await userGamesRepository.update(
        userGameId,
        { condition: form.condition, conditionNote: form.conditionNote },
        tx,
      );
      await userGamesRepository.setExpansions(
        userGameId,
        [...new Set(form.expansionIds)],
        tx,
      );
      logger.debug("Copy saved", { userGameId });
      return updated;
    });
};
