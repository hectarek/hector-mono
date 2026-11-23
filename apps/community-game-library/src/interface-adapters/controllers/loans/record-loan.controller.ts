import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRecordLoanUseCase } from "@/src/application/use-cases/loans/record-loan.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const loanFields = {
  userGameId: z.uuid(),
  borrowerUserId: z.uuid(),
  pickedUpOn: z.iso.date(),
};

// C9's loan: a week, two weeks or a month (R17), or until a picked date.
const inputSchema = z.union([
  z.strictObject({
    ...loanFields,
    periodDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  }),
  z.strictObject({ ...loanFields, dueOn: z.iso.date() }),
]);

export type IRecordLoanController = ReturnType<typeof recordLoanController>;

// Record a loan (C9), as of today in Eastern time (KTD9).
export const recordLoanController = (
  useCase: IRecordLoanUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "recordLoan",
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
    return useCase(data, userId, todayIn(PLAN_TIME_ZONE));
  };
};
