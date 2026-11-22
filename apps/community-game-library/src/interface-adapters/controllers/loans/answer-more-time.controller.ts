import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAnswerMoreTimeUseCase } from "@/src/application/use-cases/loans/answer-more-time.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { optionalText } from "@/src/interface-adapters/controllers/suggestions/form-fields";

// C13's answers: yes until the date asked, yes until a date of the owner's own, or no, each with
// a note that may be left empty.
const inputSchema = z.union([
  z.object({
    loanId: z.uuid(),
    answer: z.literal("yes"),
    dueOn: z.iso.date(),
    note: optionalText(500),
  }),
  // Strict, so a yes with a date that fails isn't taken as a yes to the date asked.
  z.strictObject({
    loanId: z.uuid(),
    answer: z.literal("yes"),
    note: optionalText(500),
  }),
  z.strictObject({
    loanId: z.uuid(),
    answer: z.literal("no"),
    note: optionalText(500),
  }),
]);

export type IAnswerMoreTimeController = ReturnType<
  typeof answerMoreTimeController
>;

// The owner's answer to a request for more time (C13), as of today in Eastern time (KTD9).
export const answerMoreTimeController = (
  useCase: IAnswerMoreTimeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "answerMoreTime",
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
    const { loanId, ...answer } = data;
    return useCase(loanId, answer, userId, todayIn(PLAN_TIME_ZONE));
  };
};
