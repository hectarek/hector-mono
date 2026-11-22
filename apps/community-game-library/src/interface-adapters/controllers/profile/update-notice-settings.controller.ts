import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateNoticeSettingsUseCase } from "@/src/application/use-cases/profile/update-notice-settings.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { NOTICE_GROUPS } from "@/src/entities/notice-types";

const inputSchema = z.object({
  group: z.enum(NOTICE_GROUPS),
  on: z.boolean(),
});

export type IUpdateNoticeSettingsController = ReturnType<
  typeof updateNoticeSettingsController
>;

// One of E7's switches, as it flips.
export const updateNoticeSettingsController = (
  useCase: IUpdateNoticeSettingsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateNoticeSettings",
  });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.group, data.on, userId);
  };
};
