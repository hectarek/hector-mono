import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IUserGamesRepository } from "@/src/application/repositories/user-games.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";
import { answerSuggestion } from "@/src/application/use-cases/suggestions/answer-step";
import {
  checkFamily,
  storeGameImage,
} from "@/src/application/use-cases/suggestions/game-record";
import { loggable } from "@/src/entities/errors/loggable";
import type { Game, GameRecord } from "@/src/entities/models/game.model";
import type { Photo } from "@/src/entities/profile-photo";

export type IAddGameUseCase = ReturnType<typeof addGameUseCase>;

// G3, Add a game by hand (R5): only the title is needed, and the search title is written with it
// (KTD10). Its picture is an upload or an address. Added from a suggestion (G2's Add it by hand),
// the suggestion is answered in the same transaction: the game lands on the suggester's shelf and
// they're told (R4).
export const addGameUseCase = (
  requireAdmin: IRequireAdmin,
  gamesRepository: IGamesRepository,
  gameSuggestionsRepository: IGameSuggestionsRepository,
  userGamesRepository: IUserGamesRepository,
  userSettingsRepository: IUserSettingsRepository,
  noticesRepository: INoticesRepository,
  fileStorage: IFileStorage,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addGame" });
  const repositories = {
    gameSuggestions: gameSuggestionsRepository,
    games: gamesRepository,
    userGames: userGamesRepository,
    userSettings: userSettingsRepository,
    notices: noticesRepository,
  };

  return async (
    record: GameRecord,
    photo: Photo | null,
    suggestionId: string | null,
    userId: string,
  ): Promise<Game> => {
    requireAdmin(userId);
    const image = photo ? await storeGameImage(fileStorage, photo) : null;
    try {
      return await transactionManagerService.startTransaction(async (tx) => {
        const withImage = image ? { ...record, imageUrl: image.url } : record;
        await checkFamily(gamesRepository, withImage, tx);
        const game = await gamesRepository.add(withImage, tx);
        if (suggestionId) {
          await answerSuggestion(
            repositories,
            suggestionId,
            { status: "added", gameId: game.id },
            userId,
            tx,
          );
        }
        logger.debug("Game added", { gameId: game.id });
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
