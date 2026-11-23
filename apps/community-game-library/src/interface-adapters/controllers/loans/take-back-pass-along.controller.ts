import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITakeBackPassAlongUseCase } from "@/src/application/use-cases/loans/take-back-pass-along.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ loanId: z.uuid() });

export type ITakeBackPassAlongController = ReturnType<
  typeof takeBackPassAlongController
>;

// "I still have it", by the giver, while the next friend hasn't confirmed.
export const takeBackPassAlongController = (
  useCase: ITakeBackPassAlongUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "takeBackPassAlong",
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
