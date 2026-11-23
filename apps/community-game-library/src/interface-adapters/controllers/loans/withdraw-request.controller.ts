import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IWithdrawRequestUseCase } from "@/src/application/use-cases/loans/withdraw-request.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ loanId: z.uuid() });

export type IWithdrawRequestController = ReturnType<
  typeof withdrawRequestController
>;

// Withdraw a request (C16), by its borrower.
export const withdrawRequestController = (
  useCase: IWithdrawRequestUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "withdrawRequest",
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
