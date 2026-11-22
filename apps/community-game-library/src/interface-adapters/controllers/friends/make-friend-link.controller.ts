import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IMakeFriendLinkUseCase } from "@/src/application/use-cases/friends/make-friend-link.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IMakeFriendLinkController = ReturnType<
  typeof makeFriendLinkController
>;

// E2's Make a new link, after its dialog.
export const makeFriendLinkController = (
  useCase: IMakeFriendLinkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "makeFriendLink",
  });

  return async (userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, new Date());
  };
};
