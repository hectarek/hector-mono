import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListMyLibraryUseCase } from "@/src/application/use-cases/copies/list-my-library.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IListMyLibraryController = ReturnType<
  typeof listMyLibraryController
>;

// My library (B6) for the signed-in member, on the plan's today (KTD9).
export const listMyLibraryController = (
  useCase: IListMyLibraryUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listMyLibrary",
  });

  return async (userId: string | undefined) => {
    logger.debug("Checking the user", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, todayIn(PLAN_TIME_ZONE));
  };
};
