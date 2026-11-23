import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IListLoansUseCase,
  LoansList,
} from "@/src/application/use-cases/loans/list-loans.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IListLoansController = ReturnType<typeof listLoansController>;

// Loans (C4) for the signed-in member, as of today in Eastern time (KTD9).
export const listLoansController = (
  useCase: IListLoansUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "listLoans" });

  return async (userId: string | undefined): Promise<LoansList> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, todayIn(PLAN_TIME_ZONE));
  };
};
