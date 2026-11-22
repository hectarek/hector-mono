import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAnswerSuggestionUseCase } from "@/src/application/use-cases/suggestions/answer-suggestion.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  suggestionId: z.uuid(),
  answer: z.discriminatedUnion("status", [
    z.object({ status: z.literal("already-here"), gameId: z.uuid() }),
    z.object({
      status: z.literal("declined"),
      declineNote: z.string().trim().min(1, "Say why").max(500),
    }),
  ]),
});

export type IAnswerSuggestionController = ReturnType<
  typeof answerSuggestionController
>;

// G2's It's already here (the game picked) and Decline (with its reason), for the admin.
export const answerSuggestionController = (
  useCase: IAnswerSuggestionUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "answerSuggestion",
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
    return useCase(data.suggestionId, data.answer, userId);
  };
};
