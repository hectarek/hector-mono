import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateMemberRoleUseCase } from "@/src/application/use-cases/spaces/update-member-role.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { inviteRoleSchema } from "@/src/entities/models/space.model";

const inputSchema = z.object({
  spaceId: z.uuid(),
  memberId: z.uuid(),
  role: inviteRoleSchema,
});

export type IUpdateMemberRoleController = ReturnType<
  typeof updateMemberRoleController
>;

export const updateMemberRoleController = (
  useCase: IUpdateMemberRoleUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateMemberRole",
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

    return useCase(data.spaceId, data.memberId, data.role, userId);
  };
};
