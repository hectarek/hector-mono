import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListWaysInUseCase } from "@/src/application/use-cases/account/list-ways-in.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import type { WayIn } from "@/src/entities/ways-in";

export type IListWaysInController = ReturnType<typeof listWaysInController>;

// How the signed-in member signs in (E5), and only theirs.
export const listWaysInController = (
  useCase: IListWaysInUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listWaysIn",
  });

  return async (userId: string | undefined): Promise<WayIn[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
