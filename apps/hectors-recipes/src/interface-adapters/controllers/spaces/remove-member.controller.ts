import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemoveMemberUseCase } from "@/src/application/use-cases/spaces/remove-member.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  spaceId: z.uuid(),
  memberId: z.uuid(),
});

export type IRemoveMemberController = ReturnType<typeof removeMemberController>;

export const removeMemberController = (
  useCase: IRemoveMemberUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removeMember",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.spaceId, data.memberId, userId);
  };
};
