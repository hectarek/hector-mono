import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAcceptInviteUseCase } from "@/src/application/use-cases/spaces/accept-invite.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { Space } from "@/src/entities/models/space.model";

const inputSchema = z.object({
  token: z.string().min(8).max(100),
  makeDefault: z.boolean().default(false),
});

export type IAcceptInviteController = ReturnType<typeof acceptInviteController>;

export const acceptInviteController = (
  useCase: IAcceptInviteUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "acceptInvite",
  });

  return async (input: unknown, userId: string | undefined): Promise<Space> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.token, userId, { makeDefault: data.makeDefault });
  };
};
