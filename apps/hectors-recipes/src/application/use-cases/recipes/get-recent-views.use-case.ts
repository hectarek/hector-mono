import type { IActivityEventsRepository } from "@/src/application/repositories/activity-events.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";

export type IGetRecentViewsUseCase = ReturnType<typeof getRecentViewsUseCase>;

// The recipes this person has opened, each once, the most recent first (docs/ux-plan.md D106),
// from their `recipe-viewed` events. Only their own.
export const getRecentViewsUseCase = (
  activityEventsRepository: IActivityEventsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getRecentViews",
  });

  return async (userId: string): Promise<string[]> => {
    const ids = await activityEventsRepository.recentRecipeIds(
      userId,
      "recipe-viewed",
    );
    logger.debug("Recent views fetched", { count: ids.length });
    return ids;
  };
};
