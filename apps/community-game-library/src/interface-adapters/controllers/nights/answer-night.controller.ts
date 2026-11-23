import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAnswerNightUseCase } from "@/src/application/use-cases/nights/answer-night.use-case";
import { NIGHT_ANSWERS } from "@/src/application/use-cases/nights/answer-night.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.strictObject({
  gameNightId: z.uuid(),
  answer: z.enum(NIGHT_ANSWERS),
  guests: z.number().int().min(0).max(20).default(0),
});

export type IAnswerNightController = ReturnType<typeof answerNightController>;

// D2's, D3's and D4's answers: going, maybe or can't go, or the waitlist, with guests.
export const answerNightController = (
  useCase: IAnswerNightUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "answerNight",
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
    return useCase(
      data.gameNightId,
      { answer: data.answer, guests: data.guests },
      userId,
    );
  };
};
