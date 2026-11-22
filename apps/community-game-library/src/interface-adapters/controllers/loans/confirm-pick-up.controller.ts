import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IConfirmPickUpUseCase } from "@/src/application/use-cases/loans/confirm-pick-up.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const inputSchema = z.object({ loanId: z.uuid(), pickedUpOn: z.iso.date() });

export type IConfirmPickUpController = ReturnType<
  typeof confirmPickUpController
>;

// "I've picked it up" (C3) or the owner's "Priya has it" (C17), with the day, as of today in Eastern time (KTD9).
export const confirmPickUpController = (
  useCase: IConfirmPickUpUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "confirmPickUp",
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
