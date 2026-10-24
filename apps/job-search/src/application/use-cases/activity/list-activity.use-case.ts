import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  ActivityFilter,
  ActivityPage,
} from "@/src/entities/models/activity.model";

export type IListActivityUseCase = ReturnType<typeof listActivityUseCase>;

// The owner's changes, newest first (R19): Hector and Claude both read them, for one record's
// history or everything in a window of time.
export const listActivityUseCase = (
  activityRepository: IActivityRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "listActivity",
  });

  return async (
    ownerId: string,
    filter: ActivityFilter,
  ): Promise<ActivityPage> => {
    const page = await activityRepository.list(ownerId, filter);
    logger.debug("Activity listed", { count: page.entries.length });
    return page;
  };
};
