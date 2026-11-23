import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IConfirmPassAlongUseCase } from "@/src/application/use-cases/loans/confirm-pass-along.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const inputSchema = z.object({ loanId: z.uuid(), pickedUpOn: z.iso.date() });

export type IConfirmPassAlongController = ReturnType<
  typeof confirmPassAlongController
>;

// The next friend's "I have it", with the day, as of today in Eastern time (KTD9).
export const confirmPassAlongController = (
  useCase: IConfirmPassAlongUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "confirmPassAlong",
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
      data.pickedUpOn,
      userId,
      todayIn(PLAN_TIME_ZONE),
    );
  };
};
