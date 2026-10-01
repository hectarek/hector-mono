import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import { InputParseError } from "@/src/entities/errors/common";
import type { InviteRole } from "@/src/entities/models/space.model";

export type IUpdateMemberRoleUseCase = ReturnType<
  typeof updateMemberRoleUseCase
>;

export const updateMemberRoleUseCase = (
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "updateMemberRole",
  });

  return async (
    spaceId: string,
    memberId: string,
    role: InviteRole,
    userId: string,
  ): Promise<void> => {
    await requireOwner(spacesRepository, spaceId, userId);
    if (memberId === userId) {
      throw new InputParseError("The owner's role can't be changed");
    }
    await spacesRepository.updateMemberRole(spaceId, memberId, role);
    logger.info("Member role updated", { spaceId, memberId, role });
  };
};
