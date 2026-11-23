import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGiveBackUseCase } from "@/src/application/use-cases/loans/give-back.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const inputSchema = z.object({ loanId: z.uuid(), returnedOn: z.iso.date() });

export type IGiveBackController = ReturnType<typeof giveBackController>;

// "I gave it back to Sam" (C5), with the day, as of today in Eastern time (KTD9).
export const giveBackController = (
  useCase: IGiveBackUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "giveBack",
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
      data.returnedOn,
      userId,
      todayIn(PLAN_TIME_ZONE),
    );
  };
};
