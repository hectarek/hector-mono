import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetNoticeSettingsUseCase } from "@/src/application/use-cases/profile/get-notice-settings.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IGetNoticeSettingsController = ReturnType<
  typeof getNoticeSettingsController
>;

// E7's switches as the signed-in member left them.
export const getNoticeSettingsController = (
  useCase: IGetNoticeSettingsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getNoticeSettings",
  });

  return async (userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
