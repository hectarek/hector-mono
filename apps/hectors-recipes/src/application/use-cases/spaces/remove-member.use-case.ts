import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";

export type IRemoveMemberUseCase = ReturnType<typeof removeMemberUseCase>;

// The owner can remove anyone else; any other member can remove themselves (leave).
export const removeMemberUseCase = (
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "removeMember" });

  return async (
    spaceId: string,
    memberId: string,
    userId: string,
  ): Promise<void> => {
    if (memberId === userId) {
      const role = await spacesRepository.getMemberRole(spaceId, userId);
      if (!role) {
        throw new NotFoundError("You're not a member of this space");
      }
      if (role === "owner") {
        throw new InputParseError(
          "The owner can't leave; delete the space instead",
        );
      }
    } else {
      await requireOwner(spacesRepository, spaceId, userId);
    }

    await spacesRepository.removeMember(spaceId, memberId);
    logger.info("Member removed", {
      spaceId,
      memberId,
      self: memberId === userId,
    });
  };
};
