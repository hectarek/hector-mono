import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISendFriendRequestUseCase } from "@/src/application/use-cases/friends/send-friend-request.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ recipientUserId: z.uuid() });

export type ISendFriendRequestController = ReturnType<
  typeof sendFriendRequestController
>;

// Add friend (E1, A5).
export const sendFriendRequestController = (
  useCase: ISendFriendRequestUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "sendFriendRequest",
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
    return useCase(data.recipientUserId, userId);
  };
};
