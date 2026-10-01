import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IEnsureInviteLinksUseCase } from "@/src/application/use-cases/spaces/ensure-invite-links.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type {
  InviteRole,
  SpaceInvite,
} from "@/src/entities/models/space.model";

const inputSchema = z.object({ spaceId: z.uuid() });

export type IEnsureInviteLinksController = ReturnType<
  typeof ensureInviteLinksController
>;

export const ensureInviteLinksController = (
  useCase: IEnsureInviteLinksUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "ensureInviteLinks",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<Record<InviteRole, SpaceInvite>> => {
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
