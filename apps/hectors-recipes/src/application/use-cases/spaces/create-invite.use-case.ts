import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import type {
  InviteRole,
  SpaceInvite,
} from "@/src/entities/models/space.model";

export type ICreateInviteUseCase = ReturnType<typeof createInviteUseCase>;

export const createInviteUseCase = (
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "createInvite" });

  return async (
    spaceId: string,
    role: InviteRole,
    userId: string,
  ): Promise<SpaceInvite> => {
    await requireOwner(spacesRepository, spaceId, userId);
    const invite = await spacesRepository.createInvite(spaceId, role, userId);
    logger.info("Invite created", { spaceId, role });
    return invite;
  };
};
