import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IListPastNightsUseCase,
  PastNight,
} from "@/src/application/use-cases/nights/list-past-nights.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListPastNightsController = ReturnType<
  typeof listPastNightsController
>;

// Past game nights (D12) for the signed-in member, as of now.
export const listPastNightsController = (
  useCase: IListPastNightsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listPastNights",
  });

  return async (userId: string | undefined): Promise<PastNight[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, new Date());
  };
};
