import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAnswerFriendRequestUseCase } from "@/src/application/use-cases/friends/answer-friend-request.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { FRIEND_REQUEST_ANSWERS } from "@/src/entities/models/friend-request.model";

const inputSchema = z.object({
  requestId: z.uuid(),
  answer: z.enum(FRIEND_REQUEST_ANSWERS),
});

export type IAnswerFriendRequestController = ReturnType<
  typeof answerFriendRequestController
>;

// E1's Accept and Decline.
export const answerFriendRequestController = (
  useCase: IAnswerFriendRequestUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "answerFriendRequest",
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
    return useCase(data.requestId, data.answer, userId);
  };
};
