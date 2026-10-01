import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireOwner } from "@/src/application/use-cases/spaces/require-owner";
import type { SpaceType } from "@/src/entities/models/space.model";

export type IDeleteSpaceUseCase = ReturnType<typeof deleteSpaceUseCase>;

export const deleteSpaceUseCase = (
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "deleteSpace" });

  // Deletes the space and everything in it for every member (cascade).
  return async (spaceId: string, userId: string): Promise<SpaceType> => {
    const space = await requireOwner(spacesRepository, spaceId, userId);
    await spacesRepository.delete(spaceId);
    logger.info("Space deleted", { spaceId, type: space.type, userId });
    return space.type;
  };
};
