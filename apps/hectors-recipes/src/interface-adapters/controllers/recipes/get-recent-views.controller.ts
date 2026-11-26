import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetRecentViewsUseCase } from "@/src/application/use-cases/recipes/get-recent-views.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IGetRecentViewsController = ReturnType<
  typeof getRecentViewsController
>;

export const getRecentViewsController = (
  getRecentViewsUseCase: IGetRecentViewsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getRecentViews",
  });

  return async (userId: string | undefined): Promise<string[]> => {
    logger.debug("Getting recent views", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    return getRecentViewsUseCase(userId);
  };
};
