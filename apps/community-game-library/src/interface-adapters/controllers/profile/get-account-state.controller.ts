import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetAccountStateUseCase } from "@/src/application/use-cases/profile/get-account-state.use-case";
import type { AccountState } from "@/src/entities/account-state";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IGetAccountStateController = ReturnType<
  typeof getAccountStateController
>;

export const getAccountStateController = (
  useCase: IGetAccountStateUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getAccountState",
  });

  return async (userId: string | undefined): Promise<AccountState> => {
    logger.debug("Checking the user", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
