import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteAccountUseCase } from "@/src/application/use-cases/account/delete-account.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IDeleteAccountController = ReturnType<
  typeof deleteAccountController
>;

// Delete the signed-in member's account (E9), after its dialog, as of now.
export const deleteAccountController = (
  useCase: IDeleteAccountUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deleteAccount",
  });

  return async (userId: string | undefined): Promise<void> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    await useCase(userId, new Date());
  };
};
