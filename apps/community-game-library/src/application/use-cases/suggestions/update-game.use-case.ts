import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import {
  checkFamily,
  checkTypeChange,
  creditOnlyItsImage,
  storeGameImage,
} from "@/src/application/use-cases/suggestions/game-record";
import { NotFoundError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { Game, GameRecord } from "@/src/entities/models/game.model";
import type { Photo } from "@/src/entities/profile-photo";

export type IUpdateGameUseCase = ReturnType<typeof updateGameUseCase>;

// G4, a game's record (R5, R7): the admin corrects its details, its picture and its how-to-play
// link, and whether it's an expansion and of which game, while no shelf depends on its type.
// The row is the one source of truth, with no history kept.
export const updateGameUseCase = (
  requireAdmin: IRequireAdmin,
  gamesRepository: IGamesRepository,
  userGamesRepository: IUserGamesRepository,
  fileStorage: IFileStorage,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "updateGame" });

  return async (
    gameId: string,
    record: GameRecord,
    photo: Photo | null,
    userId: string,
  ): Promise<Game> => {
    requireAdmin(userId);
    const image = photo ? await storeGameImage(fileStorage, photo) : null;
    try {
      return await transactionManagerService.startTransaction(async (tx) => {
        const current = await gamesRepository.getById(gameId, tx);
        if (!current) {
          throw new NotFoundError();
        }
        const withImage = creditOnlyItsImage(
          current,
          image ? { ...record, imageUrl: image.url } : record,
        );
        await checkFamily(gamesRepository, withImage, tx, gameId);
        await checkTypeChange(userGamesRepository, current, withImage, tx);
        const game = await gamesRepository.update(gameId, withImage, tx);
        logger.debug("Game saved", { gameId });
        return game;
      });
    } catch (err) {
      if (image) {
        await fileStorage
          .remove("catalog-images", image.key)
          .catch((removeErr) => {
            logger.warn("Couldn't remove an unused image", loggable(removeErr));
          });
      }
      throw err;
    }
  };
};
