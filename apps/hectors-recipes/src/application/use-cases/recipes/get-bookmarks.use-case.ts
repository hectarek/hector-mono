import type { IBookmarksRepository } from "@/src/application/repositories/bookmarks.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";

export type IGetBookmarksUseCase = ReturnType<typeof getBookmarksUseCase>;

// The recipes this person has saved, newest first (docs/ux-plan.md D77). Only their own.
export const getBookmarksUseCase = (
  bookmarksRepository: IBookmarksRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getBookmarks",
  });

  return async (userId: string): Promise<string[]> => {
    const ids = await bookmarksRepository.listRecipeIds(userId);
    logger.debug("Bookmarks fetched", { count: ids.length });
    return ids;
  };
};
