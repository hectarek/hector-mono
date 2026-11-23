import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IGetRecordLoanChoicesUseCase,
  RecordLoanChoices,
} from "@/src/application/use-cases/loans/get-record-loan-choices.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IGetRecordLoanChoicesController = ReturnType<
  typeof getRecordLoanChoicesController
>;

// Record a loan's choices (C9) for the signed-in member, as of today in Eastern time (KTD9).
export const getRecordLoanChoicesController = (
  useCase: IGetRecordLoanChoicesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getRecordLoanChoices",
  });

  return async (userId: string | undefined): Promise<RecordLoanChoices> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, todayIn(PLAN_TIME_ZONE));
  };
};
