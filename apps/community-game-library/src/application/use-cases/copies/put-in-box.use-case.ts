import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { Game } from "@/src/entities/models/game.model";
import type { UserGame } from "@/src/entities/models/user-game.model";

export type IPutInBoxUseCase = ReturnType<typeof putInBoxUseCase>;

// "In my box" on an expansion's result (R3, B8, B10): the expansion goes in the box of the
// member's copy of its base game, never on the shelf as a game of its own. A box that holds it
// already is left as it is. With two copies of the base game and neither holding it, it goes in
// the older one's, since no board says which; that copy's page can move it (B7).
export const putInBoxUseCase = (
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "putInBox" });

  return async (
    expansionId: string,
    userId: string,
  ): Promise<{ copy: UserGame; expansion: Game; baseGame: Game }> =>
    transactionManagerService.startTransaction(async (tx) => {
      const expansion = await gamesRepository.getById(expansionId, tx);
      if (!expansion) {
        throw new NotFoundError();
      }
      if (expansion.type !== "expansion" || expansion.baseGameId === null) {
        throw new InputParseError("Only an expansion goes in a box");
      }
      const baseGame = await gamesRepository.getById(expansion.baseGameId, tx);
      if (!baseGame) {
        throw new NotFoundError();
      }
      const copies = (await userGamesRepository.listOwn(userId, tx)).filter(
        (copy) => copy.gameId === baseGame.id,
      );
      const [oldest] = copies;
      if (!oldest) {
        throw new InputParseError(`Add ${baseGame.title} first`);
      }
      const boxes = await userGamesRepository.listExpansionsInBoxes(
        copies.map((copy) => copy.id),
        tx,
      );
      const holding = boxes.find((row) => row.gameId === expansion.id);
      const copy = copies.find((own) => own.id === holding?.userGameId);
      if (copy) {
        return { copy, expansion, baseGame };
      }
      await userGamesRepository.setExpansions(
        oldest.id,
        [
          ...boxes
            .filter((row) => row.userGameId === oldest.id)
            .map((row) => row.gameId),
          expansion.id,
        ],
        tx,
      );
      logger.debug("Put in a box", {
        userGameId: oldest.id,
        gameId: expansion.id,
      });
      return { copy: oldest, expansion, baseGame };
    });
};
