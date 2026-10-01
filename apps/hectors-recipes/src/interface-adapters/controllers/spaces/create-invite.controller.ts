import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICreateInviteUseCase } from "@/src/application/use-cases/spaces/create-invite.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  inviteRoleSchema,
  type SpaceInvite,
} from "@/src/entities/models/space.model";

const inputSchema = z.object({
  spaceId: z.uuid(),
  role: inviteRoleSchema,
});

export type ICreateInviteController = ReturnType<typeof createInviteController>;

export const createInviteController = (
  useCase: ICreateInviteUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "createInvite",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<SpaceInvite> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.spaceId, data.role, userId);
  };
};
