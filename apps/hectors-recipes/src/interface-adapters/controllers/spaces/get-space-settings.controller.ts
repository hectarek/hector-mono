import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IGetSpaceSettingsUseCase,
  SpaceSettings,
} from "@/src/application/use-cases/spaces/get-space-settings.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  spaceId: z.uuid(),
});

export type IGetSpaceSettingsController = ReturnType<
  typeof getSpaceSettingsController
>;

export const getSpaceSettingsController = (
  useCase: IGetSpaceSettingsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getSpaceSettings",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<SpaceSettings> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.spaceId, userId);
  };
};
