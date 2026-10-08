import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetBookmarksUseCase } from "@/src/application/use-cases/recipes/get-bookmarks.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IGetBookmarksController = ReturnType<typeof getBookmarksController>;

export const getBookmarksController = (
  getBookmarksUseCase: IGetBookmarksUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getBookmarks",
  });

  return async (userId: string | undefined): Promise<string[]> => {
    logger.debug("Getting bookmarks", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    return getBookmarksUseCase(userId);
  };
};
