import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICancelLoanUseCase } from "@/src/application/use-cases/loans/cancel-loan.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ loanId: z.uuid() });

export type ICancelLoanController = ReturnType<typeof cancelLoanController>;

// Call off a yes before the pick-up (C17, C3), by its owner or its borrower.
export const cancelLoanController = (
  useCase: ICancelLoanUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "cancelLoan",
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
    return useCase(data.loanId, userId);
  };
};
