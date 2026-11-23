import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRequestLoanUseCase } from "@/src/application/use-cases/loans/request-loan.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { optionalText } from "@/src/interface-adapters/controllers/suggestions/form-fields";

const inputSchema = z.object({
  userGameId: z.uuid(),
  note: optionalText(500),
  join: z.boolean().default(false),
});

export type IRequestLoanController = ReturnType<typeof requestLoanController>;

// Ask to borrow (C1) or Join the line (C10): the copy, and the note to its owner, which may be
// left empty.
export const requestLoanController = (
  useCase: IRequestLoanUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "requestLoan",
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
    return useCase(data, userId);
  };
};
