import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IInviteToNightUseCase } from "@/src/application/use-cases/nights/invite-to-night.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.strictObject({
  gameNightId: z.uuid(),
  userIds: z.array(z.uuid()).min(1).max(100),
});

export type IInviteToNightController = ReturnType<
  typeof inviteToNightController
>;

// Send invites (D10): the friends ticked, by id.
export const inviteToNightController = (
  useCase: IInviteToNightUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "inviteToNight",
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
    return useCase(data.gameNightId, data.userIds, userId);
  };
};
