import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRevokeInviteUseCase } from "@/src/application/use-cases/spaces/revoke-invite.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  inviteId: z.uuid(),
});

export type IRevokeInviteController = ReturnType<typeof revokeInviteController>;

export const revokeInviteController = (
  useCase: IRevokeInviteUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "revokeInvite",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<string> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.inviteId, userId);
  };
};
