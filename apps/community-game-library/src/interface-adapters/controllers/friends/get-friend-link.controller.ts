import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetFriendLinkUseCase } from "@/src/application/use-cases/friends/get-friend-link.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IGetFriendLinkController = ReturnType<
  typeof getFriendLinkController
>;

// Your friend link (E2), made when you have none that works.
export const getFriendLinkController = (
  useCase: IGetFriendLinkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getFriendLink",
  });

  return async (userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, new Date());
  };
};
