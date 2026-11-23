import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IListWhatEndsUseCase,
  WhatEnds,
} from "@/src/application/use-cases/account/list-what-ends.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListWhatEndsController = ReturnType<typeof listWhatEndsController>;

// What deleting the signed-in member's account ends (E8), as of now.
export const listWhatEndsController = (
  useCase: IListWhatEndsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listWhatEnds",
  });

  return async (userId: string | undefined): Promise<WhatEnds> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, new Date());
  };
};
