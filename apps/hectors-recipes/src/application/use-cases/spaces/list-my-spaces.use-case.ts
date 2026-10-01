import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  SpaceType,
  SpaceWithRole,
} from "@/src/entities/models/space.model";

export type IListMySpacesUseCase = ReturnType<typeof listMySpacesUseCase>;

export const listMySpacesUseCase = (
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "listMySpaces" });

  return async (userId: string, type: SpaceType): Promise<SpaceWithRole[]> => {
    const spaces = await spacesRepository.listForUser(userId, type);
    logger.debug("Spaces listed", { type, count: spaces.length });
    return spaces;
  };
};
