import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetDefaultSpaceUseCase } from "@/src/application/use-cases/spaces/set-default-space.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { setDefaultSpaceSchema } from "@/src/entities/models/space.model";

export type ISetDefaultSpaceController = ReturnType<
  typeof setDefaultSpaceController
>;

export const setDefaultSpaceController = (
  setDefaultSpaceUseCase: ISetDefaultSpaceUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "setDefaultSpace",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Setting default space", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = setDefaultSpaceSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return setDefaultSpaceUseCase(userId, data.type, data.spaceId);
  };
};
