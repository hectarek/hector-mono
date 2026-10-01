import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IEnsurePersonalSpaceUseCase } from "@/src/application/use-cases/spaces/ensure-personal-space.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { type Space, spaceTypeSchema } from "@/src/entities/models/space.model";

export type IEnsurePersonalSpaceController = ReturnType<
  typeof ensurePersonalSpaceController
>;

export const ensurePersonalSpaceController = (
  ensurePersonalSpaceUseCase: IEnsurePersonalSpaceUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "ensurePersonalSpace",
  });

  return async (type: unknown, userId: string | undefined): Promise<Space> => {
    logger.debug("Resolving personal space", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = spaceTypeSchema.safeParse(type);
    if (parseError) {
      throw new InputParseError("Invalid space type", { cause: parseError });
    }

    return ensurePersonalSpaceUseCase(userId, data);
  };
};
