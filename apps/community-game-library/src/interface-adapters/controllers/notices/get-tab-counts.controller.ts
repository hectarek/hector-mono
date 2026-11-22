import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetTabCountsUseCase } from "@/src/application/use-cases/notices/get-tab-counts.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IGetTabCountsController = ReturnType<typeof getTabCountsController>;

// The tabs' counts and the bell's, for the signed-in member, as of today in Eastern time (KTD9).
export const getTabCountsController = (
  useCase: IGetTabCountsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getTabCounts",
  });

  return async (userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, todayIn(PLAN_TIME_ZONE));
  };
};
