import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IListPastLoansUseCase,
  PastLoans,
} from "@/src/application/use-cases/loans/list-past-loans.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListPastLoansController = ReturnType<
  typeof listPastLoansController
>;

// Past loans (C12) for the signed-in member.
export const listPastLoansController = (
  useCase: IListPastLoansUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listPastLoans",
  });

  return async (userId: string | undefined): Promise<PastLoans> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
