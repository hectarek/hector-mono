import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  FriendPage,
  IGetFriendUseCase,
} from "@/src/application/use-cases/friends/get-friend.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { parseLibraryView } from "@/src/entities/library-filters";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const idSchema = z.uuid();

export type IGetFriendController = ReturnType<typeof getFriendController>;

// A friend's page (E3) for the signed-in member, their library filtered and sorted as the page's
// address says (R13). A malformed id is Not found's twin, InputParseError.
export const getFriendController = (
  useCase: IGetFriendUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "getFriend" });

  return async (
    friendId: string,
    params: Record<string, string | string[] | undefined>,
    userId: string | undefined,
  ): Promise<FriendPage> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = idSchema.safeParse(friendId);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(
      data,
      userId,
      todayIn(PLAN_TIME_ZONE),
      parseLibraryView(params),
    );
  };
};
