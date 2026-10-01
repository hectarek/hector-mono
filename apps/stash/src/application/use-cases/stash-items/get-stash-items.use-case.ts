import type { IStashItemsRepository } from "@/src/application/repositories/stash-items.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { StashItem } from "@/src/entities/models/stash-item.model";

export type IGetStashItemsUseCase = ReturnType<typeof getStashItemsUseCase>;

export const getStashItemsUseCase = (
  stashItemsRepository: IStashItemsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getStashItems",
  });

  return async (
    userId: string,
  ): Promise<{ queued: StashItem[]; completed: StashItem[] }> => {
    logger.debug("Fetching stash items", { userId });

    const items = await stashItemsRepository.getForUser(userId);

    const queued = items
      .filter((item) => item.status === "queued")
      .sort((a, b) => a.position - b.position);

    const completed = items
      .filter((item) => item.status === "completed")
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
      );

    logger.debug("Stash items fetched", {
      queued: queued.length,
      completed: completed.length,
    });

    return { queued, completed };
  };
};
