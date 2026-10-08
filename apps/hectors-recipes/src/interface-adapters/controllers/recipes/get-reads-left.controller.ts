import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetReadsLeftUseCase } from "@/src/application/use-cases/recipes/get-reads-left.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IGetReadsLeftController = ReturnType<typeof getReadsLeftController>;

export const getReadsLeftController = (
  getReadsLeftUseCase: IGetReadsLeftUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getReadsLeft",
  });

  return async (userId: string | undefined): Promise<number> => {
    logger.debug("Getting reads left", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    return getReadsLeftUseCase(userId);
  };
};
