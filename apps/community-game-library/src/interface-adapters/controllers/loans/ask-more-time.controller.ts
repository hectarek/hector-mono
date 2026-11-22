import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAskMoreTimeUseCase } from "@/src/application/use-cases/loans/ask-more-time.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { optionalText } from "@/src/interface-adapters/controllers/suggestions/form-fields";

const inputSchema = z.object({
  loanId: z.uuid(),
  dueOn: z.iso.date(),
  note: optionalText(500),
});

export type IAskMoreTimeController = ReturnType<typeof askMoreTimeController>;

// C6's Ask Sam: the date asked for and a note that may be left empty, as of today in Eastern time
// (KTD9).
export const askMoreTimeController = (
  useCase: IAskMoreTimeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "askMoreTime",
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
      data.loanId,
      { dueOn: data.dueOn, note: data.note },
      userId,
      todayIn(PLAN_TIME_ZONE),
    );
  };
};
