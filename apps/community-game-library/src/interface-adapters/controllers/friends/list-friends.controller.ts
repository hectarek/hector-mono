import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListFriendsUseCase } from "@/src/application/use-cases/friends/list-friends.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListFriendsController = ReturnType<typeof listFriendsController>;

// Friends (E1) for the signed-in member.
export const listFriendsController = (
  useCase: IListFriendsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listFriends",
  });

  return async (userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
