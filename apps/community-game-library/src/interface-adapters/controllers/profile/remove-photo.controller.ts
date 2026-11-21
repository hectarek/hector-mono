import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemovePhotoUseCase } from "@/src/application/use-cases/profile/remove-photo.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IRemovePhotoController = ReturnType<typeof removePhotoController>;

export const removePhotoController = (
  useCase: IRemovePhotoUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removePhoto",
  });

  return async (userId: string | undefined): Promise<void> => {
    logger.debug("Checking the user", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
