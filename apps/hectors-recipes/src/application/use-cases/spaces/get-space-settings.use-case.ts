import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";
import type {
  Space,
  SpaceInvite,
  SpaceMember,
  SpaceRole,
} from "@/src/entities/models/space.model";

export type SpaceSettings = {
  space: Space;
  role: SpaceRole;
  members: SpaceMember[];
  // Only the owner sees invite links.
  invites: SpaceInvite[];
};

export type IGetSpaceSettingsUseCase = ReturnType<
  typeof getSpaceSettingsUseCase
>;

export const getSpaceSettingsUseCase = (
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getSpaceSettings",
  });

  return async (spaceId: string, userId: string): Promise<SpaceSettings> => {
    const space = await spacesRepository.getById(spaceId);
    if (!space) {
      throw new NotFoundError("Space not found");
    }

    const role = await requireSpaceRole(spacesRepository, {
      spaceId,
      userId,
      type: space.type,
      minRole: "viewer",
    });

    const [members, invites] = await Promise.all([
      spacesRepository.listMembers(spaceId),
      role === "owner"
        ? spacesRepository.listActiveInvites(spaceId)
        : Promise.resolve([]),
    ]);

    logger.debug("Settings loaded", { spaceId, role, members: members.length });
    return { space, role, members, invites };
  };
};
