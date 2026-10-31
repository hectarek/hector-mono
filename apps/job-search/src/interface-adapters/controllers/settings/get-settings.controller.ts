import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetSettingsUseCase } from "@/src/application/use-cases/settings/get-settings.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  getSettingsSchema,
  type Settings,
} from "@/src/entities/models/settings.model";

export type IGetSettingsController = ReturnType<typeof getSettingsController>;

// The read behind the settings page and get_settings. It takes no input.
export const getSettingsController = (
  useCase: IGetSettingsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getSettings",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<Settings> => {
    const { error: parseError } = getSettingsSchema.safeParse(input);
    if (parseError) {
      logger.warn("get_settings input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId);
  };
};
