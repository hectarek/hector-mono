import { z } from "zod";
import type { IGameSuggestionsRepository } from "@/src/application/repositories/game-suggestions.repository.interface";
import type { INoticesRepository } from "@/src/application/repositories/notices.repository.interface";
import type { IFileStorage } from "@/src/application/services/file-storage.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type { AdminAccount } from "@/src/application/use-cases/admin/require-admin";
import { loggable } from "@/src/entities/errors/loggable";
import type {
  GameSuggestion,
  NewGameSuggestion,
} from "@/src/entities/models/game-suggestion.model";
import { PHOTO_EXTENSIONS, type Photo } from "@/src/entities/profile-photo";

export type ISuggestGameUseCase = ReturnType<typeof suggestGameUseCase>;

// What B9 asks: the title, and what else the member knows.
export type SuggestionForm = Omit<NewGameSuggestion, "createdBy" | "imageUrl">;

// B9 (R4): a member suggests a game search didn't find, with a photo of the box if they have
// one, which goes to the public catalog bucket (KTD11). The admin is told (suggestion-arrived) in
// the suggestion's own transaction (KTD7); with no admin set, nobody is.
export const suggestGameUseCase = (
  gameSuggestionsRepository: IGameSuggestionsRepository,
  noticesRepository: INoticesRepository,
  fileStorage: IFileStorage,
  transactionManagerService: ITransactionManagerService,
  admin: AdminAccount,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "suggestGame" });
  const adminUserId = z.uuid().safeParse(admin.adminUserId);

  return async (
    form: SuggestionForm,
    photo: Photo | null,
    userId: string,
  ): Promise<GameSuggestion> => {
    const key = photo
      ? `suggestions/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[photo.contentType]}`
      : null;
    if (photo && key) {
      await fileStorage.put(
        "catalog-images",
        key,
        photo.bytes,
        photo.contentType,
      );
    }
    try {
      return await transactionManagerService.startTransaction(async (tx) => {
        const suggestion = await gameSuggestionsRepository.add(
          {
            ...form,
            createdBy: userId,
            imageUrl: key ? fileStorage.publicUrl("catalog-images", key) : null,
          },
          tx,
        );
        if (adminUserId.success && adminUserId.data !== userId) {
          await noticesRepository.add(
            {
              userId: adminUserId.data,
              type: "suggestion-arrived",
              createdBy: userId,
              gameSuggestionId: suggestion.id,
            },
            tx,
          );
        }
        logger.debug("Suggested", { gameSuggestionId: suggestion.id });
        return suggestion;
      });
    } catch (err) {
      // The suggestion never took the photo: nothing would point at it.
      if (key) {
        await fileStorage.remove("catalog-images", key).catch((removeErr) => {
          logger.warn("Couldn't remove an unused photo", loggable(removeErr));
        });
      }
      throw err;
    }
  };
};
