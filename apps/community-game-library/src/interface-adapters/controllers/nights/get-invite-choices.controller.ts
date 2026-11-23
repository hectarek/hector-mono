import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetInviteChoicesUseCase } from "@/src/application/use-cases/nights/get-invite-choices.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ gameNightId: z.uuid() });

export type IGetInviteChoicesController = ReturnType<
  typeof getInviteChoicesController
>;

// Invite people's Not invited yet (D10).
export const getInviteChoicesController = (
  useCase: IGetInviteChoicesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getInviteChoices",
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
    return useCase(data.gameNightId, userId);
  };
};
