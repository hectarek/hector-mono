import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IGetNightGameChoicesUseCase,
  NightGameChoice,
} from "@/src/application/use-cases/nights/get-night-game-choices.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IGetNightGameChoicesController = ReturnType<
  typeof getNightGameChoicesController
>;

// Pick from your library (D6) for the signed-in member.
export const getNightGameChoicesController = (
  useCase: IGetNightGameChoicesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getNightGameChoices",
  });

  return async (userId: string | undefined): Promise<NightGameChoice[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
