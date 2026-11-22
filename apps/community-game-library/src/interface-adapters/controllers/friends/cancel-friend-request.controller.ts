import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICancelFriendRequestUseCase } from "@/src/application/use-cases/friends/cancel-friend-request.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ requestId: z.uuid() });

export type ICancelFriendRequestController = ReturnType<
  typeof cancelFriendRequestController
>;

// Cancel request (E1, A5).
export const cancelFriendRequestController = (
  useCase: ICancelFriendRequestUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "cancelFriendRequest",
  });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.requestId, userId);
  };
};
