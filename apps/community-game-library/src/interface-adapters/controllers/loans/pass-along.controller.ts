import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IPassAlongUseCase } from "@/src/application/use-cases/loans/pass-along.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ loanId: z.uuid() });

export type IPassAlongController = ReturnType<typeof passAlongController>;

// "I gave it to Jo" (C11), by the borrower handing the copy on.
export const passAlongController = (
  useCase: IPassAlongUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "passAlong",
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
