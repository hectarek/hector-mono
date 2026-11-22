import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAnswerRequestUseCase } from "@/src/application/use-cases/loans/answer-request.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { optionalText } from "@/src/interface-adapters/controllers/suggestions/form-fields";

// C2's answers: yes for a week, two weeks or a month (R16), yes until a picked date, or no, each
// with a note that may be left empty.
const inputSchema = z.union([
  z.object({
    loanId: z.uuid(),
    answer: z.literal("yes"),
    periodDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
    note: optionalText(500),
  }),
  z.object({
    loanId: z.uuid(),
    answer: z.literal("yes"),
    dueOn: z.iso.date(),
    note: optionalText(500),
  }),
  z.object({
    loanId: z.uuid(),
    answer: z.literal("no"),
    note: optionalText(500),
  }),
]);

export type IAnswerRequestController = ReturnType<
  typeof answerRequestController
>;

// The owner's answer to a request (C2), as of today in Eastern time (KTD9).
export const answerRequestController = (
  useCase: IAnswerRequestUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "answerRequest",
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
