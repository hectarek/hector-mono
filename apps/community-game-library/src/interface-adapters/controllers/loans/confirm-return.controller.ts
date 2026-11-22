import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IConfirmReturnUseCase } from "@/src/application/use-cases/loans/confirm-return.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { optionalText } from "@/src/interface-adapters/controllers/suggestions/form-fields";

// C8's answers: yes, it's back, on a day, with anything new missing or damaged, which may be left
// empty; or not yet.
const inputSchema = z.union([
  z.object({
    loanId: z.uuid(),
    answer: z.literal("back"),
    returnedOn: z.iso.date(),
    note: optionalText(500),
  }),
  z.object({ loanId: z.uuid(), answer: z.literal("not-yet") }),
]);

export type IConfirmReturnController = ReturnType<
  typeof confirmReturnController
>;

// The owner's Is it back? (C8), as of today in Eastern time (KTD9).
export const confirmReturnController = (
  useCase: IConfirmReturnUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "confirmReturn",
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
