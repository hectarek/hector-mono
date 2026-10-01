import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetStashItemsUseCase } from "@/src/application/use-cases/stash-items/get-stash-items.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import type { StashItem } from "@/src/entities/models/stash-item.model";

export type IGetStashItemsController = ReturnType<
  typeof getStashItemsController
>;

export const getStashItemsController = (
  getStashItemsUseCase: IGetStashItemsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getStashItems",
  });

  return async (
    userId: string | undefined,
  ): Promise<{ queued: StashItem[]; completed: StashItem[] }> => {
    logger.debug("Fetching stash items", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to view stash");
    }

    return getStashItemsUseCase(userId);
  };
};
