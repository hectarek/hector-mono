import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateSettingsUseCase } from "@/src/application/use-cases/settings/update-settings.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Settings,
  updateSettingsSchema,
} from "@/src/entities/models/settings.model";

export type IUpdateSettingsController = ReturnType<
  typeof updateSettingsController
>;

// The settings form's write: human-only (R21), so no page tool calls it.
export const updateSettingsController = (
  useCase: IUpdateSettingsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateSettings",
  });

  return async (input: unknown, context: ChangeContext): Promise<Settings> => {
    const { data, error: parseError } = updateSettingsSchema.safeParse(input);
    if (parseError) {
      logger.warn("Settings input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid settings", { cause: parseError });
    }
    return useCase(context, data);
  };
};
