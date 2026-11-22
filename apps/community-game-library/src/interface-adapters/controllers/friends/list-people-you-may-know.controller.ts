import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListPeopleYouMayKnowUseCase } from "@/src/application/use-cases/friends/list-people-you-may-know.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListPeopleYouMayKnowController = ReturnType<
  typeof listPeopleYouMayKnowController
>;

// Step 2 of setting up (A5): the people your new friend knows.
export const listPeopleYouMayKnowController = (
  useCase: IListPeopleYouMayKnowUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listPeopleYouMayKnow",
  });

  return async (userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
