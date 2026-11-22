import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IGetLoanUseCase,
  LoanPage,
} from "@/src/application/use-cases/loans/get-loan.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const inputSchema = z.object({ loanId: z.uuid() });

export type IGetLoanController = ReturnType<typeof getLoanController>;

// A loan's page for the signed-in member, as of today in Eastern time (KTD9). A malformed id is
// Not found's twin, InputParseError.
export const getLoanController = (
  useCase: IGetLoanUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "getLoan" });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<LoanPage> => {
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
