import type { IBookmarksRepository } from "@/src/application/repositories/bookmarks.repository.interface";
import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";

export type ISetBookmarkUseCase = ReturnType<typeof setBookmarkUseCase>;

// Saves a recipe for this person, or no longer (docs/ux-plan.md D77). Anyone who can open a
// recipe can save it: opening one needs only a session (getRecipe), so the recipe has only to
// exist.
export const setBookmarkUseCase = (
  bookmarksRepository: IBookmarksRepository,
  recipesRepository: IRecipesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "setBookmark",
  });

  return async (
    userId: string,
    recipeId: string,
    saved: boolean,
  ): Promise<void> => {
    await transactionManagerService.startTransaction(async (tx) => {
      if (!(await recipesRepository.getById(recipeId, tx))) {
        throw new NotFoundError("Recipe not found");
      }
      await bookmarksRepository.set(userId, recipeId, saved, tx);
    });
    logger.info("Bookmark set", { recipeId, saved });
  };
};
