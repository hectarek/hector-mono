import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICallBackUseCase } from "@/src/application/use-cases/loans/call-back.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const inputSchema = z.object({ loanId: z.uuid() });

export type ICallBackController = ReturnType<typeof callBackController>;

// C15's Call it back, as of today in Eastern time (KTD9).
export const callBackController = (
  useCase: ICallBackUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "callBack" });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.loanId, userId, todayIn(PLAN_TIME_ZONE));
  };
};
