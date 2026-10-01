import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import { NotFoundError } from "@/src/entities/errors/common";

export type IRevokeInviteUseCase = ReturnType<typeof revokeInviteUseCase>;

export const revokeInviteUseCase = (
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "revokeInvite" });

  return async (inviteId: string, userId: string): Promise<string> => {
    const invite = await spacesRepository.getInviteById(inviteId);
    if (!invite) {
      throw new NotFoundError("Invite not found");
    }
    await requireOwner(spacesRepository, invite.spaceId, userId);
    await spacesRepository.revokeInvite(inviteId);
    logger.info("Invite revoked", { spaceId: invite.spaceId });
    return invite.spaceId;
  };
};
